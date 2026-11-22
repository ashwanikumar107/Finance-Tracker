const express = require('express');
const { body } = require('express-validator');
const CategoryController = require('../controllers/categoryController');
const authenticate = require('../middleware/authenticate');
const { checkWriteAccess } = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticate);

const categoryValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Category name is required (max 100 characters).'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be either income or expense.'),
  body('color').optional().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Valid hex color code required.'),
  validateRequest,
];

router.get('/', CategoryController.getCategories);
router.post('/', checkWriteAccess, categoryValidation, CategoryController.createCategory);
router.put('/:id', checkWriteAccess, CategoryController.updateCategory);
router.delete('/:id', checkWriteAccess, CategoryController.deleteCategory);

module.exports = router;
