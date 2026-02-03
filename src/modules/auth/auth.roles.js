module.exports.allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        const err = new Error("Please log in to access this resource.");
        err.statusCode = 401;
        throw err;
      }

      if (!allowedRoles.includes(req.user.role)) {
        // Construct a user-friendly message based on allowed roles
        const roleDescriptions = {
          admin: "administrators",
          authority: "authority users",
          citizen: "citizens"
        };
        const allowedNames = allowedRoles.map(r => roleDescriptions[r] || r).join(" or ");
        const err = new Error(`This action is only available to ${allowedNames}.`);
        err.statusCode = 403;
        throw err;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
