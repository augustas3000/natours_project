const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');

// import a review router into tour router:
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// should the following route be triggetered - essentially:
// api/v1/tours/:tourId/reviews, use the reviewRouter, but the
// reviewRouters needs access to the parameter :tourID
router.use('/:tourId/reviews', reviewRouter);

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

// a route to find all the tours within a given distance from given
// location: - standard way of specifying urls with lots of options:
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// a route to calculate distances to each  tour location within the
// radius
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// we will add middleware to protect tour routes so that only logged in users can access
router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
