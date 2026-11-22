const db = require('../config/db');
const CacheService = require('../services/cacheService');

class TransactionController {
  /**
   * List transactions with search, filter, sort, and pagination
   * GET /api/transactions
   */
  static async getTransactions(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      // Query params
      const {
        search = '',
        type = '',
        category_id = '',
        start_date = '',
        end_date = '',
        sort_by = 'transaction_date',
        sort_order = 'DESC',
        page = 1,
        limit = 10,
        all_users = 'false', // Admin option to view all transactions
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      // Base query building
      let conditions = [];
      let params = [];
      let paramIdx = 1;

      // Access control: Only admin can see all_users if requested
      if (userRole === 'admin' && all_users === 'true') {
        // No user_id condition
      } else {
        conditions.push(`t.user_id = $${paramIdx++}`);
        params.push(userId);
      }

      if (search.trim()) {
        conditions.push(`(t.title ILIKE $${paramIdx} OR t.description ILIKE $${paramIdx})`);
        params.push(`%${search.trim()}%`);
        paramIdx++;
      }

      if (type && ['income', 'expense'].includes(type.toLowerCase())) {
        conditions.push(`t.type = $${paramIdx++}`);
        params.push(type.toLowerCase());
      }

      if (category_id && !isNaN(parseInt(category_id, 10))) {
        conditions.push(`t.category_id = $${paramIdx++}`);
        params.push(parseInt(category_id, 10));
      }

      if (start_date) {
        conditions.push(`t.transaction_date >= $${paramIdx++}`);
        params.push(start_date);
      }

      if (end_date) {
        conditions.push(`t.transaction_date <= $${paramIdx++}`);
        params.push(end_date);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query for pagination total
      const countQuery = `
        SELECT COUNT(t.id) AS total_count
        FROM transactions t
        ${whereClause}
      `;
      const countRes = await db.query(countQuery, params);
      const totalCount = parseInt(countRes.rows[0].total_count, 10);

      // Safe sort validation
      const allowedSortFields = ['transaction_date', 'amount', 'title', 'created_at'];
      const safeSortField = allowedSortFields.includes(sort_by) ? sort_by : 'transaction_date';
      const safeSortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Data query
      const dataQuery = `
        SELECT 
          t.id,
          t.user_id,
          t.title,
          t.amount,
          t.type,
          t.category_id,
          c.name AS category_name,
          c.color AS category_color,
          t.transaction_date,
          t.payment_method,
          t.description,
          t.created_at,
          u.name AS user_name,
          u.email AS user_email
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        JOIN users u ON t.user_id = u.id
        ${whereClause}
        ORDER BY t.${safeSortField} ${safeSortOrder}, t.id DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;

      params.push(limitNum, offset);
      const dataRes = await db.query(dataQuery, params);

      return res.status(200).json({
        success: true,
        data: {
          transactions: dataRes.rows.map(r => ({
            ...r,
            amount: parseFloat(r.amount),
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
            hasNextPage: pageNum * limitNum < totalCount,
            hasPrevPage: pageNum > 1,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single transaction by ID
   * GET /api/transactions/:id
   */
  static async getTransactionById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      let query = `
        SELECT 
          t.id,
          t.user_id,
          t.title,
          t.amount,
          t.type,
          t.category_id,
          c.name AS category_name,
          c.color AS category_color,
          t.transaction_date,
          t.payment_method,
          t.description,
          t.created_at
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.id = $1
      `;
      const params = [id];

      // Regular and read-only users can only access their own transactions
      if (userRole !== 'admin') {
        query += ' AND t.user_id = $2';
        params.push(userId);
      }

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found or access denied.',
        });
      }

      const txn = result.rows[0];
      txn.amount = parseFloat(txn.amount);

      return res.status(200).json({
        success: true,
        data: { transaction: txn },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create new transaction
   * POST /api/transactions
   */
  static async createTransaction(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        title,
        amount,
        type,
        category_id,
        transaction_date,
        payment_method = 'UPI',
        description = '',
      } = req.body;

      // Validate category belongs to user or is global
      const catCheck = await db.query(
        'SELECT id, type FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
        [category_id, userId]
      );

      if (catCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category specified.',
        });
      }

      const insertQuery = `
        INSERT INTO transactions (
          user_id, title, amount, type, category_id, transaction_date, payment_method, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await db.query(insertQuery, [
        userId,
        title.trim(),
        parseFloat(amount),
        type.toLowerCase(),
        parseInt(category_id, 10),
        transaction_date || new Date().toISOString().split('T')[0],
        payment_method.trim(),
        description ? description.trim() : null,
      ]);

      const createdTxn = result.rows[0];
      createdTxn.amount = parseFloat(createdTxn.amount);

      // Invalidate Redis caches for this user's analytics and insights
      await CacheService.invalidateUserCaches(userId);

      return res.status(201).json({
        success: true,
        message: 'Transaction recorded successfully.',
        data: { transaction: createdTxn },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update transaction
   * PUT /api/transactions/:id
   */
  static async updateTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const {
        title,
        amount,
        type,
        category_id,
        transaction_date,
        payment_method,
        description,
      } = req.body;

      // Check ownership
      let ownerCheckQuery = 'SELECT id, user_id FROM transactions WHERE id = $1';
      const checkParams = [id];
      if (userRole !== 'admin') {
        ownerCheckQuery += ' AND user_id = $2';
        checkParams.push(userId);
      }

      const existing = await db.query(ownerCheckQuery, checkParams);
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found or access denied.',
        });
      }

      const targetUserId = existing.rows[0].user_id;

      // Verify category
      if (category_id) {
        const catCheck = await db.query(
          'SELECT id FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
          [category_id, targetUserId]
        );
        if (catCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid category specified.',
          });
        }
      }

      const updateQuery = `
        UPDATE transactions
        SET 
          title = COALESCE($1, title),
          amount = COALESCE($2, amount),
          type = COALESCE($3, type),
          category_id = COALESCE($4, category_id),
          transaction_date = COALESCE($5, transaction_date),
          payment_method = COALESCE($6, payment_method),
          description = COALESCE($7, description),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `;

      const result = await db.query(updateQuery, [
        title ? title.trim() : null,
        amount ? parseFloat(amount) : null,
        type ? type.toLowerCase() : null,
        category_id ? parseInt(category_id, 10) : null,
        transaction_date || null,
        payment_method ? payment_method.trim() : null,
        description !== undefined ? description.trim() : null,
        id,
      ]);

      const updated = result.rows[0];
      updated.amount = parseFloat(updated.amount);

      // Invalidate Redis caches
      await CacheService.invalidateUserCaches(targetUserId);

      return res.status(200).json({
        success: true,
        message: 'Transaction updated successfully.',
        data: { transaction: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete transaction
   * DELETE /api/transactions/:id
   */
  static async deleteTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      let checkQuery = 'SELECT id, user_id FROM transactions WHERE id = $1';
      const checkParams = [id];
      if (userRole !== 'admin') {
        checkQuery += ' AND user_id = $2';
        checkParams.push(userId);
      }

      const existing = await db.query(checkQuery, checkParams);
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found or access denied.',
        });
      }

      const targetUserId = existing.rows[0].user_id;

      await db.query('DELETE FROM transactions WHERE id = $1', [id]);

      // Invalidate caches
      await CacheService.invalidateUserCaches(targetUserId);

      return res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TransactionController;
