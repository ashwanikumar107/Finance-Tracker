const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'pennywise_jwt_access_secret_production_key_2026';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'pennywise_jwt_refresh_secret_production_key_2026';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Generate Access Token with role & userId payload
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate cryptographically secure random Refresh Token and its hash
 */
function generateRefreshToken(user) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

/**
 * Hash raw refresh token to look up in DB
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Verify Access Token
 */
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyAccessToken,
};
