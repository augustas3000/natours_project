const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
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

    // such approach is not secure as anyone who knows the structure
    // of this url could create booking without actually paying, thou
    // they would need to be logged in n shit, but we will fix this
    // using webhooks (essential for website to be deployed)

    // success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
    //   req.params.tourId
    // }&user=${req.user.id}&price=${tour.price}`,

    // instead we create a webhook using stripe account, specifying
    // url:
    // https://natours-project-aj.herokuapp.com/webhook-checkout,
    // stripe will send session info to this url once teh payment is
    // complete/failed, essentially in our app we need a route
    // /webhook-checkout

    success_url: `${req.protocol}://${req.get('host')}/my-tours`,

    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId, //we use this to crea booking in createBookingCheckout()
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

// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // this is only temporary because its unsecure, everyone can make
//   // bookings without paying
//   const { tour, user, price } = req.query;
//   // console.log(req.query);

//   if (!tour && !user && !price) {
//     return next();
//   }

//   await Booking.create({
//     tour,
//     user,
//     price
//   });

//   res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = async session => {
  const tour = session.client_reference_id;
  // get users id by email(all good as email is unique):
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.line_items[0].amount / 100;
  console.log("IN create booking checkout -------");
  
  await Booking.create({
    tour,
    user,
    price
  });
};

exports.webhookCheckout = (req, res, next) => {
  // all of this code will run whenver the payment was successful,

  // read strip signature of our headers (when stripe calls our
  // webhook, it will add a header to tha trequest containing special
  // signature for our webhook);
  const signature = req.headers['stripe-signature'];

  // create a tripe event:
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    // send the response back to stripe
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    // create a booking - use a function, nut middleware
    // using session data we can create new booking in our db
    createBookingCheckout(event.data.object);

    res.status(200).json({
      received: true
    });
  }
};

exports.createBooking = handlerFactory.createOne(Booking);
exports.getBooking = handlerFactory.getOne(Booking);
exports.getAllBookings = handlerFactory.getAll(Booking);
exports.updateBooking = handlerFactory.updateOne(Booking);
exports.deleteBooking = handlerFactory.deleteOne(Booking);
