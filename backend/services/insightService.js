const db = require('../config/db');

class InsightService {
  /**
   * Evaluates actual transaction and budget patterns and outputs structured,
   * factual insight statements with severity and metrics.
   */
  static async generateInsights(userId) {
    const insights = [];

    // 1. Month-over-month category spending comparison
    const categoryTrendQuery = `
      WITH current_month AS (
        SELECT 
          c.name, 
          COALESCE(SUM(t.amount), 0) AS total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 
          AND t.type = 'expense'
          AND EXTRACT(MONTH FROM t.transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM t.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY c.name
      ),
      last_month AS (
        SELECT 
          c.name, 
          COALESCE(SUM(t.amount), 0) AS total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 
          AND t.type = 'expense'
          AND (
            (EXTRACT(MONTH FROM CURRENT_DATE) = 1 AND EXTRACT(MONTH FROM t.transaction_date) = 12 AND EXTRACT(YEAR FROM t.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1)
            OR
            (EXTRACT(MONTH FROM CURRENT_DATE) > 1 AND EXTRACT(MONTH FROM t.transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE) - 1 AND EXTRACT(YEAR FROM t.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE))
          )
        GROUP BY c.name
      )
      SELECT 
        cm.name, 
        cm.total AS current_total, 
        COALESCE(lm.total, 0) AS last_total,
        CASE 
          WHEN COALESCE(lm.total, 0) = 0 THEN 0
          ELSE ((cm.total - lm.total) / lm.total) * 100
        END AS pct_change
      FROM current_month cm
      LEFT JOIN last_month lm ON cm.name = lm.name
      WHERE cm.total > 0
      ORDER BY cm.total DESC
    `;

    try {
      const catTrendRes = await db.query(categoryTrendQuery, [userId]);
      const rows = catTrendRes.rows;

      if (rows.length > 0) {
        // Highest spending category this month
        const topCategory = rows[0];
        insights.push({
          id: 'top-spending-cat',
          type: 'info',
          category: topCategory.name,
          title: 'Primary Expense Driver',
          message: `You spent the most on ${topCategory.name} this month (₹${parseFloat(topCategory.current_total).toLocaleString('en-IN')}).`,
          metric: `₹${parseFloat(topCategory.current_total).toLocaleString('en-IN')}`,
          trend: 'neutral',
        });

        // Category with largest increase (> 10%)
        const significantIncrease = rows.find(r => parseFloat(r.pct_change) >= 10 && parseFloat(r.last_total) > 0);
        if (significantIncrease) {
          insights.push({
            id: `increase-${significantIncrease.name}`,
            type: 'warning',
            category: significantIncrease.name,
            title: 'Spending Surge',
            message: `Your ${significantIncrease.name} expenses increased by ${significantIncrease.pct_change}% compared to last month.`,
            metric: `+${significantIncrease.pct_change}%`,
            trend: 'up',
          });
        }

        // Category with consistent spending (change between -5% and +5%)
        const consistent = rows.find(r => Math.abs(parseFloat(r.pct_change)) <= 5 && parseFloat(r.last_total) > 0);
        if (consistent) {
          insights.push({
            id: `consistent-${consistent.name}`,
            type: 'positive',
            category: consistent.name,
            title: 'Consistent Spending',
            message: `Your ${consistent.name} spending has remained consistent with last month's pattern.`,
            metric: `${consistent.pct_change > 0 ? '+' : ''}${consistent.pct_change}%`,
            trend: 'neutral',
          });
        }
      }
    } catch (e) {
      console.error('Error computing category trends for insights:', e.message);
    }

    // 2. Budget utilization analysis for current month
    const budgetUtilizationQuery = `
      SELECT 
        c.name AS category_name,
        b.monthly_limit,
        COALESCE(SUM(t.amount), 0) AS spent,
        CASE 
          WHEN b.monthly_limit > 0 THEN ((COALESCE(SUM(t.amount), 0) / b.monthly_limit) * 100)
          ELSE 0
        END AS pct_consumed
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.user_id = b.user_id
        AND t.type = 'expense'
        AND EXTRACT(MONTH FROM t.transaction_date) = b.month
        AND EXTRACT(YEAR FROM t.transaction_date) = b.year
      WHERE b.user_id = $1 
        AND b.month = EXTRACT(MONTH FROM CURRENT_DATE)
        AND b.year = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY c.name, b.monthly_limit
      ORDER BY pct_consumed DESC
    `;

    try {
      const budgetRes = await db.query(budgetUtilizationQuery, [userId]);
      budgetRes.rows.forEach(b => {
        const pct = parseFloat(b.pct_consumed);
        if (pct >= 100) {
          insights.push({
            id: `budget-exceeded-${b.category_name}`,
            type: 'critical',
            category: b.category_name,
            title: 'Budget Limit Exceeded',
            message: `You have exceeded your ${b.category_name} budget by ${(pct - 100).toFixed(1)}% (spent ₹${parseFloat(b.spent).toLocaleString('en-IN')} of ₹${parseFloat(b.monthly_limit).toLocaleString('en-IN')}).`,
            metric: `${pct}%`,
            trend: 'alert',
          });
        } else if (pct >= 80) {
          insights.push({
            id: `budget-warning-${b.category_name}`,
            type: 'warning',
            category: b.category_name,
            title: 'Budget Threshold Approaching',
            message: `You have used ${pct}% of your monthly ${b.category_name} budget.`,
            metric: `${pct}%`,
            trend: 'alert',
          });
        }
      });
    } catch (e) {
      console.error('Error computing budget utilization for insights:', e.message);
    }

    // 3. Savings rate improvement vs previous month
    const savingsComparisonQuery = `
      WITH monthly_sr AS (
        SELECT 
          DATE_TRUNC('month', transaction_date) AS m,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS inc,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS exp
        FROM transactions
        WHERE user_id = $1
        GROUP BY DATE_TRUNC('month', transaction_date)
        ORDER BY m DESC
        LIMIT 2
      )
      SELECT * FROM monthly_sr
    `;

    try {
      const srRes = await db.query(savingsComparisonQuery, [userId]);
      if (srRes.rows.length >= 2) {
        const cur = srRes.rows[0];
        const prev = srRes.rows[1];

        const curInc = parseFloat(cur.inc);
        const curExp = parseFloat(cur.exp);
        const prevInc = parseFloat(prev.inc);
        const prevExp = parseFloat(prev.exp);

        const curSR = curInc > 0 ? ((curInc - curExp) / curInc) * 100 : 0;
        const prevSR = prevInc > 0 ? ((prevInc - prevExp) / prevInc) * 100 : 0;

        if (curSR > prevSR && curSR > 0) {
          insights.push({
            id: 'savings-rate-improved',
            type: 'positive',
            category: 'Savings',
            title: 'Savings Momentum',
            message: `Your savings rate improved compared to the previous month (${curSR.toFixed(1)}% vs ${prevSR.toFixed(1)}%).`,
            metric: `+${(curSR - prevSR).toFixed(1)}%`,
            trend: 'up',
          });
        }
      }
    } catch (e) {
      console.error('Error computing savings rate insights:', e.message);
    }

    // Fallback if brand new user with little activity
    if (insights.length === 0) {
      insights.push({
        id: 'welcome-insight',
        type: 'info',
        category: 'Overview',
        title: 'Starting Out',
        message: 'Log daily transactions and set monthly budgets to unlock personalized financial insights and anomaly alerts.',
        metric: 'Ready',
        trend: 'neutral',
      });
    }

    return insights;
  }
}

module.exports = InsightService;
