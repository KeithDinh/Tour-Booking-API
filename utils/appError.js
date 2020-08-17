class AppError extends Error {
  constructor(message, statusCode) {
    // call parent's constructor
    super(message); // Set the var 'message' inherited from parent class

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
