const db = require('../config/db');
const CacheService = require('../services/cacheService');

class BudgetController {
  /**
   * Get all budgets for user with actual spending, remaining amount, and utilization percentage
   * GET /api/budgets
   */
  static async getBudgets(req, res, next) {
    try {
      const userId = req.user.id;
      const now = new Date();
      const month = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();

      const query = `
        SELECT 
          b.id,
          b.user_id,
          b.category_id,
          c.name AS category_name,
          c.color AS category_color,
          b.monthly_limit,
          b.month,
          b.year,
          COALESCE(SUM(t.amount), 0) AS actual_spent
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        LEFT JOIN transactions t ON t.category_id = b.category_id 
          AND t.user_id = b.user_id 
          AND t.type = 'expense'
          AND EXTRACT(MONTH FROM t.transaction_date) = b.month
          AND EXTRACT(YEAR FROM t.transaction_date) = b.year
        WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
        GROUP BY b.id, b.user_id, b.category_id, c.name, c.color, b.monthly_limit, b.month, b.year
        ORDER BY b.monthly_limit DESC
      `;

      const result = await db.query(query, [userId, month, year]);

      const budgets = result.rows.map(row => {
        const limit = parseFloat(row.monthly_limit);
        const spent = parseFloat(row.actual_spent);
        const remaining = limit - spent;
        const percentageConsumed = limit > 0 ? parseFloat(((spent / limit) * 100).toFixed(1)) : 0;

        let status = 'normal'; // 'normal', 'warning' (>=80%), 'exceeded' (>=100%)
        if (percentageConsumed >= 100) {
          status = 'exceeded';
        } else if (percentageConsumed >= 80) {
          status = 'warning';
        }

        return {
          id: row.id,
          userId: row.user_id,
          categoryId: row.category_id,
          categoryName: row.category_name,
          categoryColor: row.category_color,
          monthlyLimit: limit,
          actualSpent: spent,
          remainingBudget: remaining,
          percentageConsumed,
          status,
          month: row.month,
          year: row.year,
        };
      });

      return res.status(200).json({
        success: true,
        data: { budgets, month, year },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create or upsert a monthly budget
   * POST /api/budgets
   */
  static async setBudget(req, res, next) {
    try {
      const userId = req.user.id;
      const { category_id, monthly_limit, month, year } = req.body;

      const now = new Date();
      const budgetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
      const budgetYear = year ? parseInt(year, 10) : now.getFullYear();

      // Ensure category exists
      const catCheck = await db.query(
        'SELECT id FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) AND type = \'expense\'',
        [category_id, userId]
      );

      if (catCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid expense category specified for budget.',
        });
      }

      const query = `
        INSERT INTO budgets (user_id, category_id, monthly_limit, month, year)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, category_id, month, year)
        DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit, updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await db.query(query, [
        userId,
        parseInt(category_id, 10),
        parseFloat(monthly_limit),
        budgetMonth,
        budgetYear,
      ]);

      const budget = result.rows[0];
      budget.monthly_limit = parseFloat(budget.monthly_limit);

      // Invalidate relevant Redis caches
      await CacheService.invalidateUserCaches(userId);

      return res.status(201).json({
        success: true,
        message: 'Budget allocated successfully.',
        data: { budget },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update existing budget
   * PUT /api/budgets/:id
   */
  static async updateBudget(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { monthly_limit } = req.body;

      const result = await db.query(
        `UPDATE budgets
         SET monthly_limit = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [parseFloat(monthly_limit), id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Budget entry not found.',
        });
      }

      await CacheService.invalidateUserCaches(userId);

      return res.status(200).json({
        success: true,
        message: 'Budget updated successfully.',
        data: { budget: result.rows[0] },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete budget
   * DELETE /api/budgets/:id
   */
  static async deleteBudget(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Budget entry not found.',
        });
      }

      await CacheService.invalidateUserCaches(userId);

      return res.status(200).json({
        success: true,
        message: 'Budget deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = BudgetController;
