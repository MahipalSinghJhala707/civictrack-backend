module.exports = (err, req, res, next) => {
  console.error(err);

  return res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error"
  });
};
