/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles Roles permitted to access the endpoint ('admin', 'user', 'read-only')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User context missing.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' is not authorized to perform this action.`,
      });
    }

    next();
  };
}

/**
 * Convenience helper to disallow mutations for 'read-only' users
 */
function checkWriteAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (req.user.role === 'read-only') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Read-only accounts cannot create, edit, delete, or export data.',
    });
  }

  next();
}

module.exports = {
  authorize,
  checkWriteAccess,
};
