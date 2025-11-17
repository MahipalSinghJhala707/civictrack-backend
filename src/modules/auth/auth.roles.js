module.exports.allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRoles = req.user?.roles || [];

      const isAllowed = userRoles.some(role => allowedRoles.includes(role));

      if (!isAllowed) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }

      next();
    } catch (err) {
      return res.status(500).json({ message: "Authorization error" });
    }
  };
};
