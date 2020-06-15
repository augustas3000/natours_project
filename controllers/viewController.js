const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1. Get all tour data from db.
  const tours = await Tour.find();
  // 2.Build template - overview.pug

  // 3.Render the template using the tour data from setp 1
  res.status(200).render('overview', {
    title: 'All tours',
    tours: tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1. Get tour data, using a slug from params(including reviews
  //    and guides). make sure to populate the reviews field with data
  //    from reviews documents
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });

  if (!tour) {
    // 404 - not found
    return next(new AppError('There is no tour with that name', 404));
  }

  // 2. Build template in views folder

  // 3. Render template using the data from Step1.
  res.status(200).render('tour', {
    title: `${tour.name}`,
    tour: tour
  });
});

exports.getLoginForm = catchAsync(async (req, res, next) => {
  //  render a template asking for user email and password:

  res.status(200).render('login', {
    title: 'Log into your account'
  });
});

exports.getSignupForm = catchAsync(async (req, res, next) => {
  //  render a template asking for user email and password:
  res.status(200).render('signup', {
    title: 'Create an account'
  });
});

exports.getUserAccount = (req, res) => {
  // dont even need to query for current user because that has already
  // been done in protect middleware
  // simply tu render passing the data
  res.status(200).render('account', {
    title: 'Your account'
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // get all bookings by user
  const bookings = await Booking.find({ user: req.user.id });
  console.log(bookings);

  console.log(bookings.length);

  // find tours with returned ids
  const tourIDs = bookings.map(el => el.tour.id);
  console.log(tourIDs);

  // get the tours that have an id that is in the tourIDs array
  // { _id: { $in: tourIDs } }
  const tours = await Tour.find({ _id: { $in: tourIDs } });
  console.log('🇬🇦🇬🇦🇬🇦🇬🇦🇬🇦🇬🇦🇬🇦');
  console.log(tours.length);

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  // find existing user - use logged in or protect middleware?, and
  // update, selecting only the required fields thus better security
  // there will be a separate form for updating passwords
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true, //if we want updated result in in user var
      runValidators: true
    }
  );

  res.locals.user = updatedUser;
  req.user = updatedUser;
  // now we need to update data that goes into pug template -
  // re-render the account page:

  res.status(200).render('account', {
    title: 'Your account'
    // user: updatedUser
  });
});
