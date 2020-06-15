const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const Email = require('./../utils/email');

const AppError = require('./../utils/appError');

const signToken = id => {
  //   we provide payload and secret, header will be made automatically
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // about logging out: since the cookie is httpOnly, we cant
  // interfere with it in any way from browsers point of view,
  // so for logout, we will create a simple route, which will simply
  // send back a new cookie with exact same name but without the token
  // thus overwritting the current cookie. and when the next request
  // is sent we will not be able to identify the user as logged in any
  // more - effectively log out the user, also the cookie will be
  // given very short expiration time

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: false, //the cooky will only be sent on encrypted cnnection - https if true
    httpOnly: true //cookie cannot be modified in any way by the browser
  };

  // only send a secure cookie in production environment where
  // communication will happen over https
  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // attach a cookie 🏵🏵
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined; //remove password from output but dont save

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  //  this is bad as we use all data provided by usr
  //   const newUser = await User.create(req.body);

  // instead we do this, to only allow data we need:
  // this prevents a user signin up as admin.
  const newUser = await User.create(req.body);

  // we want to point to user acc page, but this would only work on
  // development environment ---- const url =
  // 'http://localhost:3000/me';

  // insteqd of hardcoding, we get data from req -
  // WHAT PROTOCOL? http/https?
  // the host - either localhost:3000 in development env, or the real
  // host in production
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);

  // we await this so the next step happens only when the email
  // sending is complete - remember that sendWelcome is async function

  await new Email(newUser, url).sendWelcome();

  createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  //   the usr will make request to login providing creds in req body
  const { email, password } = req.body;

  //   1.check if email and password exist(were provided):
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //   2.check if user exists && password ok:
  //   In the schema we used select: false for password, so it is not
  //   is not included when sending back data to req.
  //   we however want to access password here so we can check if it is ok:
  const user = await User.findOne({ email: email }).select('+password');
  //   if usr not exists, or bad pass, throw error.
  // this will prevent cases where user is non existant, and pass comparison
  //  runs into an error
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //   3. if all ok, sign and send token to the client
  createAndSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 100),
    httpOnly: true
  });
  res.status(200).json({
    status: 'success'
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // get the token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(
      new AppError('You are not logged in, please login to get access', 401)
    );
  // validate the token (verification), using jwt verify, and providing incoming token, and secret,
  // normaly this funcion would take a callback function thrid argument, but we would like it to return
  //  a promise, and so we use promisify method from util module:
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // if verification successful, check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError('The user belonging to the token no longer exists', 401)
    );
  }
  // check if user changed pass after JWT was issued. this is done in usr model
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again', 401)
    );
  }
  // if all the checks pass, then next() will be called to continue after route

  // Grant access to protected route;
  // lastly we put entire user data on request: this will also run before restrictTo, so the current user will be
  // on request object
  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});

// for conditionally rendering login html: 😃😃😃😃😃😃😃
// this middware is for rendered pages only, so the goal is not to
// protect any route!!!  No errors to be thrown, instead catch errors
// locally and simply say next if the yexist
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER 🚙🚙🚙🚙🚙🚙
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
// usually we cant pass args into middleware
// but this time we really want to as it is essential to specify roles for restrictions
// a wrapper function is the answer. - create a function with desired params, and then right away
// return the function with (req, res, next), the inner function will thus get access to roles parameter
// of the outer function.
//  (...roles) - this will create an array of all args provided into a function(ES6 syntax)
// roles = ['admin', 'lead-guide'], if the user has role that is in roles array, the access will be given
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. get user based on posted email
  const userFound = await User.findOne({ email: req.body.email });
  if (!userFound) {
    return next(
      new AppError('User with such email address was not found', 404)
    );
  }

  // 2. generate random reset token - as instance method of User model.
  const resetToken = userFound.createPasswordResetToken();
  // this operation actually changed the db data so need to update:
  // but without specifying mandatory data, this will fail, so we want to skip(DEACTIVATE) validation.
  await userFound.save({ validateBeforeSave: false });

  // 3. Send it to user's email.
  // create a url for resetting password:
  // we will send a non encrypted token, so we can later compare it to the
  // one in our db

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/reset-password/${resetToken}`;

    await new Email(userFound, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'succes',
      message: 'Token sent to email'
    });
  } catch (err) {
    userFound.passwordResetToken = undefined;
    userFound.passwordResetExpires = undefined;
    userFound.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }

  // an error migth happen during the sendemail process, but we cant just catch that
  // we need to do more - we need to setBAck teh password reset token, and the password
  // reset expired field in the document - so we can use try/catch block -BECAUSE,
  // we want to do more than simply send an error to the client.
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // get user based on the token
  // encrypt original token so we can compare it
  console.log(req.params.token);
  
  const hashToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashToken,
    passwordResetExpires: { $gt: Date.now() } // check expiration date
  });

  if (!user) {
    next(new AppError('Token is invalid or has expired'), 400);
  }

  // set new passsword if token not expired and user exists

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // update the changedPasswordAt property for current user

  // log the user in

  createAndSendToken(user, 201, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // get user from collection, {}.
  // the updatePassword Route will be only for logged in and authenticated users,
  // so we can access the user from req.user as formed by protect middleware
  const user = await User.findById(req.user.id).select('+password');
  // check if posted pasword is correct, and if user exists
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Wrong password provided', 401));
  }
  // if so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // log user in, send jwt
  createAndSendToken(user, 200, res);
});
