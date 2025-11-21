module.exports = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.statusCode !== 401) {
    console.error(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message;
  
  const response = {
    success: false,
    message: isDevelopment ? message : (statusCode < 500 ? message : 'An error occurred')
  };

  if (isDevelopment && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};
