const db = require('../config/db');
const CacheService = require('../services/cacheService');

// Redis cache TTL requirement: 1 hour = 3600 seconds
const CATEGORY_CACHE_TTL = 3600;

class CategoryController {
  /**
   * Get categories available to the user (user's custom categories + default categories)
   * GET /api/categories
   */
  static async getCategories(req, res, next) {
    try {
      const userId = req.user.id;
      const { type } = req.query;

      const cacheKey = `categories:user:${userId}${type ? `:${type}` : ''}`;
      const cached = await CacheService.get(cacheKey);

      if (cached) {
        return res.status(200).json({
          success: true,
          source: 'cache',
          data: { categories: cached },
        });
      }

      let query = `
        SELECT id, user_id, name, type, color, created_at
        FROM categories
        WHERE (user_id = $1 OR user_id IS NULL)
      `;
      const params = [userId];

      if (type && ['income', 'expense'].includes(type.toLowerCase())) {
        query += ' AND type = $2';
        params.push(type.toLowerCase());
      }

      query += ' ORDER BY type ASC, name ASC';

      const result = await db.query(query, params);
      await CacheService.set(cacheKey, result.rows, CATEGORY_CACHE_TTL);

      return res.status(200).json({
        success: true,
        source: 'database',
        data: { categories: result.rows },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create custom category for user
   * POST /api/categories
   */
  static async createCategory(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, type, color = '#23845B' } = req.body;

      // Prevent duplicate category name for the same user and type
      const existing = await db.query(
        'SELECT id FROM categories WHERE (user_id = $1 OR user_id IS NULL) AND LOWER(name) = LOWER($2) AND type = $3',
        [userId, name.trim(), type.toLowerCase()]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Category '${name}' already exists in ${type}s.`,
        });
      }

      const result = await db.query(
        `INSERT INTO categories (user_id, name, type, color)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, name.trim(), type.toLowerCase(), color.trim()]
      );

      // Invalidate category cache for this user
      await CacheService.invalidateCategoryCaches(userId);

      return res.status(201).json({
        success: true,
        message: 'Category created successfully.',
        data: { category: result.rows[0] },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update custom category
   * PUT /api/categories/:id
   */
  static async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const { name, color } = req.body;

      // Ensure category belongs to user (or admin)
      let query = 'SELECT id, user_id, type FROM categories WHERE id = $1';
      const params = [id];
      if (userRole !== 'admin') {
        query += ' AND user_id = $2';
        params.push(userId);
      }

      const existing = await db.query(query, params);
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Category not found or default system categories cannot be modified directly.',
        });
      }

      const targetUserId = existing.rows[0].user_id || userId;

      const updateQuery = `
        UPDATE categories
        SET 
          name = COALESCE($1, name),
          color = COALESCE($2, color)
        WHERE id = $3
        RETURNING *
      `;

      const result = await db.query(updateQuery, [
        name ? name.trim() : null,
        color ? color.trim() : null,
        id,
      ]);

      await CacheService.invalidateCategoryCaches(targetUserId);

      return res.status(200).json({
        success: true,
        message: 'Category updated successfully.',
        data: { category: result.rows[0] },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete custom category
   * DELETE /api/categories/:id
   */
  static async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      let query = 'SELECT id, user_id FROM categories WHERE id = $1';
      const params = [id];
      if (userRole !== 'admin') {
        query += ' AND user_id = $2';
        params.push(userId);
      }

      const existing = await db.query(query, params);
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Category not found or you do not have permission to delete it.',
        });
      }

      // Check if transactions exist under this category
      const txnCheck = await db.query('SELECT id FROM transactions WHERE category_id = $1 LIMIT 1', [id]);
      if (txnCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category that has existing transactions. Reassign transactions first.',
        });
      }

      await db.query('DELETE FROM categories WHERE id = $1', [id]);
      await CacheService.invalidateCategoryCaches(userId);

      return res.status(200).json({
        success: true,
        message: 'Category deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CategoryController;
