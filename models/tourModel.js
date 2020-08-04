const mongoose = require('mongoose');

// "slug" is string that is put in url.
// "slugify" converts space in string into dash. Ex: "var 1" into "var-1"
const slugify = require('slugify');

// mongoose.Schema takes 2 arguments: object containing schema definition and schema optional object
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: Number,
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createAt: {
      type: Date,
      default: Date.now(),
      select: false, // Hide the data in api calls (generally used for private information like password)
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  {
    // cover 2 cases: JSON and Object
    toJSON: { virtuals: true }, // if data is outputted as JSON (more often), show virtual properties
    toObject: { virtuals: true }, // if data is outputted as Object, show virtual properties
  }
);

// "virtual" adds extra fields that won't be saved to db, optimize the storage
// Find the number of weeks based on the day duration
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// *4 types of Mongoose middleware: document, query, aggregate, and model
// More info at: https://mongoosejs.com/docs/middleware.html

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save', function (next) {
  // create the slug. NEED to add to the schema fields to display
  this.slug = slugify(this.name, { lower: true });
  next();
});

// // post middleware executes when all function completed
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
//
tourSchema.pre('find', function (next) {
  this.find({ secretTour: { $ne: true } });
  next();
});
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
