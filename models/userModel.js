const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator'); //for email validator
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
    maxlength: [40, 'A user name must have less or equal to 40 characters'],
    minlength: [2, 'A user name must have at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'A user must have an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minlength: 8,
    select: false //this will ensure the pass is not sent back wit husers data
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE - so we will have to use save, not
      // upd
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same'
    }
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  // active field will basically control the deletion status, instead of
  // completely deleting the user, we will set the status to false, so the user
  // is disabled, but we still have access to the data if needed in the future,
  // or if account was to be restored also select: false, as we dont really want
  // to show this data to the user
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

// password encyption:
// setting a pre middleware on save, so that encyption,
// will happen between the momen we receive data and persist it to db
userSchema.pre('save', async function(next) {
  // if pass not modified, exit function and call next middleware
  if (!this.isModified('password')) return next();
  // otherwise, encrypt(hash) pass: salt than hash
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined; //not to persist to db (validators: required input, but not required to persist to db)
  next();
});

userSchema.pre('save', function(next) {
  // mongodb tricks
  if (!this.isModified('password') || this.isNew) return next();

  // because saving to db is a a bit slower than issueing webtoken;
  // this might have issues so we need to minus 1 sec
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// query middleware to not return deactivated users
userSchema.pre(/^find/, function(next) {
  // 'this' points to the current query obj, notice function declararion
  this.find({ active: { $ne: false } });
  next();
});

// we will create an instance method now for comparing user input password to
// the one in db. this method will work on all docs of given collection
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  // we cant access pass directly due to select: false, hence need to provide as arg
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimeStamp) {
  if (this.passwordChangedAt) {
    // convert Date to timestamp of JWT for comparison
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // changed means that time at which the token was issued is less than
    // changed timestamp true will mean changed, false - not changed
    return JWTTimeStamp < changedTimeStamp;
  }
  // false means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  // the token needs to be a simple string but cryptographically strong
  const resetToken = crypto.randomBytes(32).toString('hex');
  // encrypt the rest token

  // encrypted version in db -useless to change pass without actual users input pass
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //miliseconds - 10 min

  // console.log('🤪 reset token: ', { resetToken });
  // console.log('🤪 passwordReset token - ENCRYPTED: ', this.passwordResetToken);
  // console.log('🤪 passwordResetExpires: ', this.passwordResetExpires);
  // vie email we need to send the unencrypted token, otherwise it would be
  // unusable by user
  return resetToken;
};

// create a model out of schema
const User = mongoose.model('User', userSchema);

module.exports = User;
