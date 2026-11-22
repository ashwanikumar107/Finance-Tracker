const { verifyAccessToken } = require('../utils/generateToken');
const db = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Access token expired. Please refresh your token.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid access token.',
      });
    }

    // Check if user still exists in DB
    const userRes = await db.query(
      'SELECT id, name, email, role, currency, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    console.error('Authentication middleware error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
}

module.exports = authenticate;
