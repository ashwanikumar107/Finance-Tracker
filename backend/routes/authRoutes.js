const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Rate limiter for authentication API: 5 requests per 15 minutes as required
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
});

// Relaxed rate limiter for development convenience or local testing if disabled via env
const isProduction = process.env.NODE_ENV === 'production';
const appliedAuthLimiter = isProduction ? authLimiter : rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email address is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  body('role').optional().isIn(['admin', 'user', 'read-only']).withMessage('Role must be admin, user, or read-only.'),
  validateRequest,
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email address is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  validateRequest,
];

// Routes
router.post('/register', appliedAuthLimiter, registerValidation, AuthController.register);
router.post('/login', appliedAuthLimiter, loginValidation, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);

module.exports = router;
