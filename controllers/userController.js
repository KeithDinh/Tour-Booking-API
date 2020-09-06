// PASSWORD HANDLERS ARE IN authController.js

const User = require('../models/userModel');
// using high-order function to avoid repeat try/catch block for each handler
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  // Object.keys return a list of properties
  Object.keys(obj).forEach((el) => {
    // find the value of allowedFields and assign to newObj
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

// exports.getAllUsers = catchAsync(async (req, res) => {
//   // EXECUTE QUERY
//   const users = await User.find();

//   // SEND RESPONSE
//   res.status(200).json({ status: 'success', results: users.length, data: {users,},});});
exports.getAllUsers = factory.getAll(User);

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) create error if user posts password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }

  // 2) update user document
  // filter out unwanted fields names that are not allowed
  const filteredBody = filterObj(req.body, 'name', 'email');

  // In this case, the ".save()" requires passwordConfirm which is not neccessary => use ".findByIdAndUpdate"
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, // return updated object instead of old one
    runValidators: true, // model validations
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // we won't actually delete the user from db, we just set the account to not-active
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getUser = factory.getOne(User);

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

// only used for update user information NOT password
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
