const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

// be default each router only has access to the params of their
// specific routes, but in these routes there is no tourID, so we need
// to access the pram in other router, we need to merge the params.
const router = express.Router({ mergeParams: true });

// protect totally all routes by adding middleware to router
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourandUserIds, //midware to set user and tour ids
    reviewController.createReview
  );

router
  .route('/:id')
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .get(reviewController.getReview);
module.exports = router;
