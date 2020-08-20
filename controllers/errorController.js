/* Also called globalhandling
 AppError is to modify/return an "error"-type variable
 It takes in 2 arguments: the output message and the status code
 */
const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  // loop through each properties in errors, look for the message
  const errors = Object.values(err.errors).map((prop) => prop.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError(`Invalid Token. Please log in again!`, 401); // 401 unauthorized

const handleJWTExpiredError = () =>
  new AppError(`Your token has expired! Please log in again.`, 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: { ...err, name: err.name, code: err.code, errmsg: err.errmsg },
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // Programming or other unknown error: don't leak error details
  else {
    // 1) Log error
    console.error('ERROR', err);

    // 2) Send generic message
    res.status(500).json({
      status: 'Error',
      message: 'Something went wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // **************************** DEVELOPMENT ****************************
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  }

  // **************************** PRODUCTION ****************************
  // the script (cmd) in package.json adds a space to NODE_ENV, use "trim()" to remove extra space
  else if (process.env.NODE_ENV.trim() === 'production') {
    /* let error = {...err} // error doesn't have properties "name" while err does,
    destructuring missing properties "name, code, errmsg" */

    let error = err;

    // happens when get a tour by ID
    if (error.name === 'CastError') error = handleCastErrorDB(error);

    // happens when create a new tour
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);

    // happens when update a tour by ID
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);

    // happens when receive the erroneous jwt
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(error, res);
  }

  next();
};
