const User = require('../models/userModel');
const { promisify } = require('util');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  // jwt.sign: create token(id, secret_string, expireTime)
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user,
    },
  });
};

// ********************************************************
// ********************** MIDDLEWARE **********************

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

  createSendToken(newUser, 201, res);
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
  createSendToken(user, 200, res);
});

// Middleware check if token is valid to keep user without logging in
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

// Middleware to restrict users on their roles
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
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passswordConfirm to ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 minutes)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,

    // Date.now() must be in range [passwordReset token issued, passwordReset token expired]
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // Update the new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  // Remove the token used for resetting password
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // save into database, by default validateBeforeSave is true. We want to use modelSchema to re-validate
  await user.save();

  // 3) Update changedPasswordAt property for the user

  // 4) Log the user in, send jwt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) get user from the collection, req.user is from "protect" middleware
  const user = await User.findById(req.user.id).select('+password');

  // 2) compare current password and password from db before update with the new password
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong ', 401));
  }
  // 3) if so, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  // user.findIdAndUpdate doesn't work because Mongoose does not keep the current value to compare with the new value. It will not re-validate data by the model and will not pre-processing by the hooks to hash password
  await user.save();

  // 4) log user in, send jwt
  createSendToken(user, 200, res);
});
