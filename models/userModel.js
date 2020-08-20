const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true, // transform to lowercase
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, // will never show up in any request
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // this only works on CREATE and SAVE
      validator: function (el) {
        /* "this" refers to the owner of the passwordConfirm 
        which is the object inside "new mongoose.Schema" */
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

userSchema.pre('save', async function (next) {
  // if the password is NOT modified => no need to hash => jump to next middleware
  if (!this.isModified('password')) return next();

  // hash the pw with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // delete the passwordConfirm field (this happens after the validation in the schema)
  this.passwordConfirm = undefined;

  next();
});

/* Think about Schema as a class with methods, * to use the "correctPassword",
 there have to be an instance of the model containing the schema (which is the data/document) */
userSchema.methods.correctPassword = async function (
  candidatePassword, // password to check
  userPassword // hashed password in the database
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// changedPasswordAfter(Boolean) takes in 1 arg: the created time of the token
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // *getTime() returns the time in milliseconds
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000);

    // if token is issued before the password is changed
    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // create a random string 32 chars and convert to hex
  const resetToken = crypto.randomBytes(32).toString('hex');
  console.log('resetToken', resetToken);

  // use algorithm sha256, hash the token, and output format to hex
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  console.log('passwordResetToken', this.passwordResetToken);

  // Date.now() return current time in milliseconds, 10 minutes = 10*60*1000 milliseconds
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
const User = mongoose.model('User', userSchema);

module.exports = User;
