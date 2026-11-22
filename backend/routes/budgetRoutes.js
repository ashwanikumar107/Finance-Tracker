const express = require('express');
const { body } = require('express-validator');
const BudgetController = require('../controllers/budgetController');
const authenticate = require('../middleware/authenticate');
const { checkWriteAccess } = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticate);

const budgetValidation = [
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID required.'),
  body('monthly_limit').isFloat({ min: 0.01 }).withMessage('Monthly limit must be a positive number.'),
  body('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12.'),
  body('year').optional().isInt({ min: 2000 }).withMessage('Valid year required.'),
  validateRequest,
];

router.get('/', BudgetController.getBudgets);
router.post('/', checkWriteAccess, budgetValidation, BudgetController.setBudget);
router.put('/:id', checkWriteAccess, BudgetController.updateBudget);
router.delete('/:id', checkWriteAccess, BudgetController.deleteBudget);

module.exports = router;
