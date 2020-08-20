const User = require('../models/userModel');
const { promisify } = require('util');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');

const signToken = (id) => {
  // jwt.sign: create token(id, secret_string, expireTime)
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  /* This line sends entire body data to the server,
  Problem: users can specify their roles (in body) as admin
  Solution: restrict the fields to be sent to server */
  // const newUser = await User.create(req.body);

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email & password exist
  if (!email || !password) {
    /* 
    When pass an arg to 'next()', it's always considered as 'error'
    The 'next(err)' skips all other middlewares and execute the one
    that has the 'err' arg
    */
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if user exists & password is correct
  // ".select('+password')" shows the password
  const user = await User.findOne({ email }).select('+password');

  const correct = await user.correctPassword(password, user.password);

  if (!user || !correct) {
    return next(new AppError('Incorrect email or password', 401)); // 401 bad authentication
  }
  // 3) If things are ok, send token to client
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token and check if it exists
  // Headers KEY: Authorization | VALUE: 'Bearer eyJ...fTbzPsVSk0'
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]; // 'Bearer eyJ...fTbzPsVSk0'
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to access', 401)
    );
  }
  // 2) Verification token
  // For more info: medium.com/trabe/understanding-nodes-promisify-and-callbackify-d2b04efde0e0
  // promisify(jwt.verify) returns a promise, then call the function (token, process.env.JWT_SECRET)
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);

  // If not exist, return error to globalErrorHandler
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed pw after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );

  // GRANT ACCESS TO THE PROTECTED ROUTE
  req.user = currentUser; // this line is crucial to execute the "restrictTo" function
  next();
});

// with spread operator, "roles" is an array of arguments ex: ['admin', 'lead-guide']
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // if ['admin', 'lead-guide'] does not include the req.user.role
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) generate random reset token
  const resetToken = user.createPasswordResetToken();

  /* "createPasswordResetToken" creates/modifies data but doesn't save to database
  we need to save the data (hashed token and expires date) to the database
  "validateBeforeSave: false" will ignore all validations specified in the model */
  await user.save({ validateBeforeSave: false });
  // 3) send it to user's email
});

exports.resetPassword = (req, res, next) => {};
