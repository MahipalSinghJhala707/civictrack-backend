module.exports = (err, req, res, next) => {
  // Don't log 401 (authentication) errors as they're expected for protected routes
  if (err.statusCode !== 401) {
  console.error(err);
  }

  return res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error"
  });
};
