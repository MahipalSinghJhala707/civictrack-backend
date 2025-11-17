const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      const error = new Error("Authentication required.");
      error.statusCode = 401;
      throw error;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      err = new Error("Session expired. Please log in again.");
      err.statusCode = 401;
    }

    if (err.name === "JsonWebTokenError") {
      err = new Error("Invalid authentication token.");
      err.statusCode = 401;
    }

    if (!err.statusCode) err.statusCode = 401;

    next(err);
  }
};
