const express = require('express');
const { body, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const TransactionController = require('../controllers/transactionController');
const authenticate = require('../middleware/authenticate');
const { checkWriteAccess } = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Rate limiter requirement: Transaction API: 100 requests per hour
const transactionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Transaction request limit reached (100 requests per hour). Please try again later.',
  },
});

router.use(authenticate);
router.use(transactionLimiter);

const transactionValidation = [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be under 255 characters.'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number greater than 0.'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be either income or expense.'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required.'),
  body('transaction_date').isISO8601().withMessage('Valid transaction date (YYYY-MM-DD) is required.'),
  body('payment_method').optional().trim().isLength({ max: 50 }).withMessage('Payment method cannot exceed 50 characters.'),
  body('description').optional().trim(),
  validateRequest,
];

// Routes
router.get('/', TransactionController.getTransactions);
router.get('/:id', TransactionController.getTransactionById);
router.post('/', checkWriteAccess, transactionValidation, TransactionController.createTransaction);
router.put('/:id', checkWriteAccess, transactionValidation, TransactionController.updateTransaction);
router.delete('/:id', checkWriteAccess, TransactionController.deleteTransaction);

module.exports = router;
