const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
// const APIFeatures = require('./../utils/apiFeatures');
const Booking = require('../models/bookingModel');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const handlerFactory = require('./handlerFactory');

// 🎾🎾🎾🎾🎾🎾🎾🎾
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // find a given tour
  const tour = await Tour.findById(req.params.tourId);

  // create a checkout session on stripe server, and send back to the client
  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],

    success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,

    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1
      }
    ]
  });
  // send to the client
  res.status(200).json({
    status: 'success',
    stripeSession
  });
});

// 🎾🎾🎾🎾🎾🎾🎾🎾

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // this is only temporary because its unsecure, everyone can make
  // bookings without paying
  const { tour, user, price } = req.query;
  // console.log(req.query);

  if (!tour && !user && !price) {
    return next();
  }

  await Booking.create({
    tour,
    user,
    price
  });

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = handlerFactory.createOne(Booking);
exports.getBooking = handlerFactory.getOne(Booking);
exports.getAllBookings = handlerFactory.getAll(Booking);
exports.updateBooking = handlerFactory.updateOne(Booking);
exports.deleteBooking = handlerFactory.deleteOne(Booking);
