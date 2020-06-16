const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Please provide the review - cant be empty']
    },
    rating: { type: Number, min: 1, max: 5 },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    // parents
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'review must belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'a review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// use a unique index to make sure one user can only write one review
// for the tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  // this will add two extra queries: to populate relevant fields with
  // related documents data

  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });

  // we turned the tour population off, because this creates too much
  // nesting when  viewing revies from tours virtual property.
  this.populate({
    path: 'user',
    select: 'name photo'
  });

  next();
});

// in review model, we gonna create a new function whch will take in
// the tour id and calculate teh avg rating and the number of ratings
// for taht exact tour, then update the corresponding tour document,
// this will happen each time a review is created/deleted/updated? -
// using middleware, a static method on review model will be used for
// the purpose
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  // simple function so thus points to model itself:
  const stats = await this.aggregate([
    {
      // first stage to select all reviews that belong to the tour
      $match: { tour: tourId }
    },
    {
      // second stage is grouping, _id is the common field to group
      // by, so - tour.
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 }, //sum up the ratings
        avgRating: { $avg: '$rating' } //avg ratings
      }
    }
  ]);
  // to be run as part of the same method as post-save middleware to
  // update tour upon creation of every review
  // only do this if there actually is something in stats array
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    // else defaults:
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};
// implement the static method:

reviewSchema.post('save', function(next) {
  // we need to call a static method from review model, but it is not
  // yet defined in this location of code. so we use 'this' as the
  // current document, and .constructor to still point to the model - Review
  this.constructor.calcAverageRatings(this.tour);
  // next(); post middleware does not get access to next
});

// for these we dont have document middleware, only query middleware:
// in the query we dont have direct access to the document
// findByIdAndUpdate
// findByIdAndDelete
// so instead we gonna implement pre-middleware

reviewSchema.pre(/^findOneAnd/, async function(next) {
  // here, this - is current querry
  this.r = await this.findOne(); //basically finds itself, and pass data from pre middleware to pos middleware
  // console.log(this.r);
  next();
});

// after the query has been finished and review updated, we can update
// the tour data
reviewSchema.post(/^findOneAnd/, async function() {
  // await this.findOne(); -- thsi does not work here as the query has
  // allready executed
  // now we need a tour id to call calcAverageRatings on it:
  // we will make it to pass data from pre meiddleware to post
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
