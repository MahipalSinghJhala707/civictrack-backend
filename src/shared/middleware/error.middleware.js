module.exports = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.statusCode !== 401) {
    console.error(err);
  }

  const statusCode = err.statusCode || 500;
  
  const response = {
    message: isDevelopment ? err.message : (err.statusCode ? err.message : 'An error occurred')
  };

  if (isDevelopment && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};
