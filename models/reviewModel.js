const mongoose = require('mongoose');
const Tour = require('../models/tourModel');
const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      require: [true, 'Review cannot be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: { type: Date, default: Date.now },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour', // name of the schema before exporting
      require: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      require: [true, 'Review must belong to a user.'],
    },
  },
  {
    // For virtual properties, cover 2 cases: JSON and Object
    toJSON: { virtuals: true }, // if data is outputted as JSON (more often), display virtual properties
    toObject: { virtuals: true }, // if data is outputted as Object, display virtual properties
  }
);

// The index stores the value of a specific field or set of fields, ordered by the value of the field
// unique restricts 1 user can only have 1 review on a tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'user', // name of field to replace
  //   select: 'name photo',
  // }).populate({
  //   path: 'tour',
  //   select: 'name',
  // });
  this.populate({
    path: 'user', // name of field to replace
    select: 'name photo',
  });

  next();
});

// used to calculate the average ratings
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      // select the tourId that we want to update
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour', // group tour together by tours
        nRating: { $sum: 1 }, // increment if match
        avgRating: { $avg: '$rating' }, // find avg
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5, //default when no reviews at all
    });
  }
};

// calculate avgRatings and review Quantity after adding a new review
reviewSchema.post('save', function () {
  // this points to current review

  this.constructor.calcAverageRatings(this.tour);
});

// Use "pre" hook to save the tour id before updating/deleting reviews, then use "post" hook to update the avgRatings of tour using tourId provided by "pre" hook
// using regex, hook is called when any findOneAnd function is called (NOTE: findIdAndUpdate, findIdAndDelete are shorthands of findOneAnd with id)
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // r is created in "pre" hook, r.tour gets the id of current tour
  if (this.r) {
    await this.r.constructor.calcAverageRatings(this.r.tour);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
