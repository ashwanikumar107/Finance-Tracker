const express = require('express');
const { body } = require('express-validator');
const UserController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// All routes here are restricted to 'admin' role
router.use(authenticate);
router.use(authorize('admin'));

const roleValidation = [
  body('role').isIn(['admin', 'user', 'read-only']).withMessage('Role must be one of: admin, user, read-only.'),
  validateRequest,
];

router.get('/', UserController.getAllUsers);
router.get('/activity-logs', UserController.getActivityLogs);
router.get('/:id', UserController.getUserById);
router.put('/:id/role', roleValidation, UserController.updateUserRole);
router.delete('/:id', UserController.deleteUser);

module.exports = router;
