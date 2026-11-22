const bcrypt = require('bcrypt');
const db = require('../config/db');
const { generateAccessToken, generateRefreshToken, hashToken } = require('../utils/generateToken');

// Default initial categories to seed for a new user
const DEFAULT_CATEGORIES = [
  // Expenses
  { name: 'Food', type: 'expense', color: '#EF4444' },
  { name: 'Transport', type: 'expense', color: '#F97316' },
  { name: 'Shopping', type: 'expense', color: '#8B5CF6' },
  { name: 'Entertainment', type: 'expense', color: '#EC4899' },
  { name: 'Bills', type: 'expense', color: '#EAB308' },
  { name: 'Healthcare', type: 'expense', color: '#06B6D4' },
  { name: 'Education', type: 'expense', color: '#3B82F6' },
  { name: 'Other', type: 'expense', color: '#6B7280' },
  // Income
  { name: 'Salary', type: 'income', color: '#10B981' },
  { name: 'Freelancing', type: 'income', color: '#14B8A6' },
  { name: 'Investments', type: 'income', color: '#6366F1' },
  { name: 'Business', type: 'income', color: '#23845B' },
  { name: 'Other', type: 'income', color: '#64748B' },
];

class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;

      // Check if user already exists
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }

      // Default role to 'user' unless admin explicitly creates or system config
      // 'admin', 'user', 'read-only'
      const assignedRole = ['admin', 'user', 'read-only'].includes(role) ? role : 'user';

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const result = await db.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, currency, created_at`,
        [name.trim(), email.toLowerCase().trim(), hashedPassword, assignedRole]
      );

      const user = result.rows[0];

      // Auto-seed default categories for this new user
      for (const cat of DEFAULT_CATEGORIES) {
        await db.query(
          `INSERT INTO categories (user_id, name, type, color) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT DO NOTHING`,
          [user.id, cat.name, cat.type, cat.color]
        );
      }

      const accessToken = generateAccessToken(user);
      const { rawToken, tokenHash, expiresAt } = generateRefreshToken(user);

      await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt]
      );

      return res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: {
          user,
          accessToken,
          refreshToken: rawToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * User login
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await db.query(
        `SELECT id, name, email, password, role, currency, created_at
         FROM users
         WHERE email = $1`,
        [email.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      // Safe user object without password
      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        currency: user.currency,
        created_at: user.created_at,
      };

      const accessToken = generateAccessToken(safeUser);
      const { rawToken, tokenHash, expiresAt } = generateRefreshToken(safeUser);

      await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt]
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user: safeUser,
          accessToken,
          refreshToken: rawToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Exchange Refresh Token for a fresh Access Token
   * POST /api/auth/refresh
   */
  static async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required.',
        });
      }

      const tokenHash = hashToken(refreshToken);

      const tokenRes = await db.query(
        `SELECT rt.id, rt.user_id, rt.expires_at, u.name, u.email, u.role, u.currency
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1`,
        [tokenHash]
      );

      if (tokenRes.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or revoked refresh token.',
        });
      }

      const tokenData = tokenRes.rows[0];

      if (new Date() > new Date(tokenData.expires_at)) {
        await db.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenData.id]);
        return res.status(401).json({
          success: false,
          message: 'Refresh token has expired. Please log in again.',
        });
      }

      const user = {
        id: tokenData.user_id,
        name: tokenData.name,
        email: tokenData.email,
        role: tokenData.role,
        currency: tokenData.currency,
      };

      const newAccessToken = generateAccessToken(user);

      return res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * User logout (revoking refresh token)
   * POST /api/auth/logout
   */
  static async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
      }
      return res.status(200).json({
        success: true,
        message: 'Successfully logged out.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get current authenticated user profile
   * GET /api/auth/me
   */
  static async getMe(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
