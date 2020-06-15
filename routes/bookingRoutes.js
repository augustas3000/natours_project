const express = require('express');
const bookingController = require('./../controllers/bookingController');
const authController = require('./../controllers/authController');

// be default each router only has access to the params of their
// specific routes, but in these routes there is no tourID, so we need
// to access the pram in other router, we need to merge the params.
const router = express.Router();

// protect all routes
router.use(authController.protect);

// a route for the client to get checkout session, need tourid
router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

// restrict the following routes:
router.use(authController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
