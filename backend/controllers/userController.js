const db = require('../config/db');

class UserController {
  /**
   * Log an admin action for auditing
   */
  static async logAdminActivity(adminId, action, targetType, targetId, details, ipAddress) {
    try {
      await db.query(
        `INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [adminId, action, targetType, targetId, JSON.stringify(details || {}), ipAddress || null]
      );
    } catch (e) {
      console.error('Failed to record admin activity log:', e.message);
    }
  }

  /**
   * Get all registered users (Admin only)
   * GET /api/users
   */
  static async getAllUsers(req, res, next) {
    try {
      const query = `
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.role, 
          u.currency, 
          u.created_at,
          COUNT(t.id) AS total_transactions,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expenses,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_income
        FROM users u
        LEFT JOIN transactions t ON u.id = t.user_id
        GROUP BY u.id, u.name, u.email, u.role, u.currency, u.created_at
        ORDER BY u.created_at DESC
      `;
      const result = await db.query(query);

      return res.status(200).json({
        success: true,
        data: {
          users: result.rows.map(u => ({
            ...u,
            total_transactions: parseInt(u.total_transactions, 10),
            total_expenses: parseFloat(u.total_expenses),
            total_income: parseFloat(u.total_income),
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get user by ID (Admin only)
   * GET /api/users/:id
   */
  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await db.query(
        'SELECT id, name, email, role, currency, created_at FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      return res.status(200).json({
        success: true,
        data: { user: result.rows[0] },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update user role (Admin only)
   * PUT /api/users/:id/role
   */
  static async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminId = req.user.id;

      if (!['admin', 'user', 'read-only'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified. Valid roles are: admin, user, read-only.',
        });
      }

      // Prevent demoting the only admin
      if (parseInt(id, 10) === adminId && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'You cannot demote your own admin account.',
        });
      }

      const result = await db.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role',
        [role, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      const updatedUser = result.rows[0];

      // Audit log
      await UserController.logAdminActivity(
        adminId,
        'UPDATE_USER_ROLE',
        'user',
        id,
        { targetEmail: updatedUser.email, newRole: role },
        req.ip
      );

      return res.status(200).json({
        success: true,
        message: `User role updated to '${role}'.`,
        data: { user: updatedUser },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete user and cascade their data (Admin only)
   * DELETE /api/users/:id
   */
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      if (parseInt(id, 10) === adminId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own account.',
        });
      }

      const userRes = await db.query('SELECT id, email, name FROM users WHERE id = $1', [id]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      const userToDelete = userRes.rows[0];
      await db.query('DELETE FROM users WHERE id = $1', [id]);

      // Audit log
      await UserController.logAdminActivity(
        adminId,
        'DELETE_USER',
        'user',
        id,
        { deletedUserEmail: userToDelete.email, deletedUserName: userToDelete.name },
        req.ip
      );

      return res.status(200).json({
        success: true,
        message: `User account '${userToDelete.name}' and all associated records deleted successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Admin Activity Logs (Admin only)
   * GET /api/admin/activity-logs
   */
  static async getActivityLogs(req, res, next) {
    try {
      const query = `
        SELECT 
          l.id,
          l.admin_id,
          u.name AS admin_name,
          u.email AS admin_email,
          l.action,
          l.target_type,
          l.target_id,
          l.details,
          l.ip_address,
          l.created_at
        FROM admin_activity_logs l
        JOIN users u ON l.admin_id = u.id
        ORDER BY l.created_at DESC
        LIMIT 100
      `;
      const result = await db.query(query);

      return res.status(200).json({
        success: true,
        data: {
          logs: result.rows,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
