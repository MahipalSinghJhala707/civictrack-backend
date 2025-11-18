module.exports.allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        const err = new Error("Authentication required.");
        err.statusCode = 401;
        throw err;
      }

      if (!allowedRoles.includes(req.user.role)) {
        const err = new Error("You do not have permission to access this resource.");
        err.statusCode = 403;
        throw err;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
