module.exports = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.statusCode !== 401) {
    console.error(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message;

  if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    message = 'Invalid CSRF token. Please refresh the page and try again.';
  }
  
  const response = {
    success: false,
    message: isDevelopment ? message : (statusCode < 500 ? message : 'An error occurred')
  };

  if (isDevelopment && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};
