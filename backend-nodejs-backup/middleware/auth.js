/**
 * Middleware to check if the user is an admin of a certain level.
 * This should run after the token verification middleware.
 * @param {number} requiredLevel The minimum admin level required to access the route.
 */
const requireAdminLevel = (requiredLevel) => {
  return (req, res, next) => {
    if (req.user && req.user.admin_level && req.user.admin_level >= requiredLevel) {
      next(); // User has the required level, proceed.
    } else {
      // User does not have permission.
      res.status(403).json({ message: `Forbidden: Admin level ${requiredLevel} or higher required.` });
    }
  };
};

module.exports = {
  requireAdminLevel,
};
