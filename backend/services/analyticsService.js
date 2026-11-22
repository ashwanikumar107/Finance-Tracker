const db = require('../config/db');

class AnalyticsService {
  /**
   * Calculate Financial Overview:
   * Total Balance, Total Income, Total Expenses, Savings Rate,
   * Month-over-month comparison, and Financial Health Indicator.
   */
  static async getOverview(userId, startDate, endDate) {
    // Current period calculations
    let dateFilter = '';
    const params = [userId];

    if (startDate && endDate) {
      dateFilter = ' AND transaction_date BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    const currentQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
        COUNT(id) AS transaction_count
      FROM transactions
      WHERE user_id = $1 ${dateFilter}
    `;

    const currentResult = await db.query(currentQuery, params);
    const totalIncome = parseFloat(currentResult.rows[0].total_income);
    const totalExpenses = parseFloat(currentResult.rows[0].total_expenses);
    const totalBalance = totalIncome - totalExpenses;

    // Savings rate = ((Income - Expenses) / Income) * 100
    let savingsRate = 0;
    if (totalIncome > 0) {
      savingsRate = Math.max(0, parseFloat((((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1)));
    }

    // Previous month comparison
    // Compare last month with month before last, or compare current month with previous month
    const comparisonQuery = `
      WITH monthly_totals AS (
        SELECT
          DATE_TRUNC('month', transaction_date) AS txn_month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
        FROM transactions
        WHERE user_id = $1
        GROUP BY DATE_TRUNC('month', transaction_date)
        ORDER BY txn_month DESC
        LIMIT 2
      )
      SELECT * FROM monthly_totals
    `;
    const compResult = await db.query(comparisonQuery, [userId]);
    const months = compResult.rows;

    let momChange = {
      incomeChangePct: 0,
      expenseChangePct: 0,
      balanceChangePct: 0,
    };

    if (months.length >= 2) {
      const cur = months[0];
      const prev = months[1];

      const prevInc = parseFloat(prev.income) || 0;
      const prevExp = parseFloat(prev.expense) || 0;
      const curInc = parseFloat(cur.income) || 0;
      const curExp = parseFloat(cur.expense) || 0;

      momChange.incomeChangePct = prevInc > 0 ? parseFloat((((curInc - prevInc) / prevInc) * 100).toFixed(1)) : 0;
      momChange.expenseChangePct = prevExp > 0 ? parseFloat((((curExp - prevExp) / prevExp) * 100).toFixed(1)) : 0;
      momChange.balanceChangePct = (prevInc - prevExp) !== 0 
        ? parseFloat(((((curInc - curExp) - (prevInc - prevExp)) / Math.abs(prevInc - prevExp)) * 100).toFixed(1))
        : 0;
    }

    // Rule-Based Financial Health Indicator
    let healthStatus = 'Moderate';
    let healthColor = '#D97706'; // Amber
    let healthExplanation = 'Your financial savings rate is reasonable. Try reducing discretionary expenses.';

    if (savingsRate >= 30) {
      healthStatus = 'Healthy';
      healthColor = '#23845B'; // Muted Emerald
      healthExplanation = `Excellent! You are saving ${savingsRate}% of your earnings, building strong financial resilience.`;
    } else if (savingsRate >= 15) {
      healthStatus = 'Moderate';
      healthColor = '#2563EB'; // Blue
      healthExplanation = `Balanced! A ${savingsRate}% savings rate is solid, but look for opportunities to optimize recurring bills.`;
    } else {
      healthStatus = 'Needs Attention';
      healthColor = '#DC2626'; // Red
      healthExplanation = totalIncome === 0 
        ? 'No income logged for this period. Add income sources to calculate your financial health score.'
        : `Your savings rate is ${savingsRate}%. Consider curbing high spending categories to avoid debt.`;
    }

    return {
      summary: {
        totalBalance,
        totalIncome,
        totalExpenses,
        savingsRate,
        transactionCount: parseInt(currentResult.rows[0].transaction_count, 10),
      },
      momComparison: momChange,
      financialHealth: {
        status: healthStatus,
        color: healthColor,
        scorePercentage: Math.min(100, Math.round(savingsRate * 2.5)),
        explanation: healthExplanation,
      },
    };
  }

  /**
   * Monthly Income vs Expenses (for bar charts)
   */
  static async getMonthlyData(userId, monthsCount = 6) {
    const query = `
      SELECT
        TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month_key,
        TO_CHAR(DATE_TRUNC('month', transaction_date), 'Mon YYYY') AS month_label,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE user_id = $1
      GROUP BY DATE_TRUNC('month', transaction_date)
      ORDER BY DATE_TRUNC('month', transaction_date) ASC
    `;
    const res = await db.query(query, [userId]);
    // Format numeric values
    return res.rows.map(row => ({
      monthKey: row.month_key,
      monthLabel: row.month_label,
      income: parseFloat(row.income),
      expense: parseFloat(row.expense),
      savings: parseFloat(row.income) - parseFloat(row.expense)
    }));
  }

  /**
   * Category-wise breakdown (doughnut/pie chart)
   */
  static async getCategoryBreakdown(userId, type = 'expense', startDate, endDate) {
    let dateFilter = '';
    const params = [userId, type];

    if (startDate && endDate) {
      dateFilter = ' AND t.transaction_date BETWEEN $3 AND $4';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        c.color AS category_color,
        COALESCE(SUM(t.amount), 0) AS total_amount,
        COUNT(t.id) AS transaction_count
      FROM categories c
      JOIN transactions t ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.type = $2 ${dateFilter}
      GROUP BY c.id, c.name, c.color
      ORDER BY total_amount DESC
    `;
    const res = await db.query(query, params);
    
    const totalAllCategories = res.rows.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);

    return res.rows.map(row => {
      const amount = parseFloat(row.total_amount);
      const percentage = totalAllCategories > 0 ? parseFloat(((amount / totalAllCategories) * 100).toFixed(1)) : 0;
      return {
        categoryId: row.category_id,
        name: row.category_name,
        color: row.category_color,
        amount,
        count: parseInt(row.transaction_count, 10),
        percentage,
      };
    });
  }

  /**
   * Yearly overview and averages
   */
  static async getYearlyOverview(userId, year) {
    const selectedYear = year || new Date().getFullYear();
    const query = `
      SELECT
        EXTRACT(MONTH FROM transaction_date) AS month_num,
        TO_CHAR(DATE_TRUNC('month', transaction_date), 'Mon') AS month_name,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM transaction_date) = $2
      GROUP BY EXTRACT(MONTH FROM transaction_date), DATE_TRUNC('month', transaction_date)
      ORDER BY month_num ASC
    `;
    const res = await db.query(query, [userId, selectedYear]);

    let totalYearlyIncome = 0;
    let totalYearlyExpenses = 0;
    res.rows.forEach(r => {
      totalYearlyIncome += parseFloat(r.income);
      totalYearlyExpenses += parseFloat(r.expense);
    });

    const activeMonths = res.rows.length || 1;
    const avgMonthlyExpense = parseFloat((totalYearlyExpenses / activeMonths).toFixed(2));
    const avgMonthlyIncome = parseFloat((totalYearlyIncome / activeMonths).toFixed(2));

    return {
      year: selectedYear,
      totalIncome: totalYearlyIncome,
      totalExpenses: totalYearlyExpenses,
      netSavings: totalYearlyIncome - totalYearlyExpenses,
      avgMonthlyExpense,
      avgMonthlyIncome,
      monthlyBreakdown: res.rows.map(r => ({
        monthNum: parseInt(r.month_num, 10),
        monthName: r.month_name,
        income: parseFloat(r.income),
        expense: parseFloat(r.expense),
      }))
    };
  }
}

module.exports = AnalyticsService;
