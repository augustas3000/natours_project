const Review = require('../models/reviewModel');

const handlerFactory = require('./handlerFactory');

exports.setTourandUserIds = (req, res, next) => {
  // if we didnt specify the tour id in the request body, then we want
  // to define the tour id as the one comming from url
  if (!req.body.tour) req.body.tour = req.params.tourId;

  // if we didnt specify user id in the request body, then we want to
  // define the user id as one comming req.user which comes from
  // protect middleware:
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = handlerFactory.getAll(Review);
exports.getReview = handlerFactory.getOne(Review);
exports.createReview = handlerFactory.createOne(Review);
exports.deleteReview = handlerFactory.deleteOne(Review);
exports.updateReview = handlerFactory.updateOne(Review);
