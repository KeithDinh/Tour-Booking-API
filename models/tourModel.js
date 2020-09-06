const mongoose = require('mongoose');
const validator = require('validator');
// "slug" is string that is put in url to be retrieved as a variable.
// "slugify" converts space in string into dash. Ex: "var 1" into "var-1"
const slugify = require('slugify');
const User = require('./userModel');
// mongoose.Schema takes 2 arguments: object containing schema definition and schema optional object
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true, // one name is only for one document
      trim: true, // remove extra space
      // the array [ ] contains a value and an error, it is the shortcut of { values: [], message: ''}
      maxlength: [40, 'A tour name must have less or equal 40 characters'],
      minlength: [10, 'A tour name must have greater or equal 10 characters'],

      // validator.isAlpha doesn't work for string containing spaces
      // validate: [ validator.isAlpha,'A tour name must only contains characters',],
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
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be above 5.0'],
      // run each time a new value is set, math.round return integer, "*10" and "/10" is the trick
      set: (currentVal) => Math.round(currentVal * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        message: 'Discount price ({VALUE}) should be below regular price', // {VALUE} = val, it is mongoose syntax
        validator: function (val) {
          // "this" only points to the new created document, so it doesn't work on "patch/update" request
          return val < this.price;
        },
      },
    },
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
      default: Date.now(), // auto set time created when insert
      select: false, // Hide the data in api calls (generally used for private information like password)
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    // start location of a tour, the time will be current
    startLocation: {
      // geoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    // list of the locations tour will visit
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array, // use for embedding

    // use for referencing
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    // For virtual properties, cover 2 cases: JSON and Object
    toJSON: { virtuals: true }, // if data is outputted as JSON (more often), display virtual properties
    toObject: { virtuals: true }, // if data is outputted as Object, display virtual properties
  }
);

// "virtual" adds extra fields that won't be saved to db to optimize storage
tourSchema.virtual('durationWeeks').get(function () {
  // Find the number of weeks based on the day duration
  return this.duration / 7;
});

// "virtual populate" used for child referencing (no array storing in parents)
tourSchema.virtual('reviews', {
  ref: 'Review', // the name of model
  foreignField: 'tour', // the parent referenced from child field
  localField: '_id',
});

// 1: sort price by ascending order, -1: sort by descending order
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ 'startLocation.coordinates': '2dsphere' });

//*4 types Mongoose middleware(or pre/post hooks): document, query, aggregate, and model | More info at: https://mongoosejs.com/docs/middleware.html

// 1) DOCUMENT MIDDLEWARE: runs before .save() and .create()
// pre hooks executes before an event (in this case is 'save'. Ex: user.save() in authController.js)
tourSchema.pre('save', function (next) {
  // create the slug. NEED to add to the schema fields to display
  this.slug = slugify(this.name, { lower: true }); // Ex: name: "Test tour 2", slug: "Test-tour-2"
  next();
});

/* REFERENCE TOUR GUIDES TO TOUR */

// /* EMBED TOUR GUIDES TO TOUR
// a tour contains an array of guides. When post a tour, before saving to database,
// it will search the guides (user) by id and embedded to the tour (denormalized) */
// tourSchema.pre('save', async function (next) {
//   // the map will return an array of promises
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));

//   // await for all promises
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// post middleware executes when all function completed
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// 2) QUERY MIDDLEWARE: add hooks before query happens
// Restrict secret tours before executing other functions/middleware
// regex starts and ends within "//", /^find/ matches all starting with "find"
tourSchema.pre(/^find/, function (next) {
  // This query is to skip secret tours on query (not aggregate)
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now(); // to calculate execution time of a query
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides', // name of field to replace
    select: '-__v -passwordChangedAt', //
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} miliseconds`);
  next();
});

// 3) AGGREGATION MIDDLEWARE: add hooks before aggregation happens
// tourSchema.pre('aggregate', function (next) {
//   // 'unshift': add element in the beginning of the array != 'push'
//   // This query is to skip secret tours on aggregate
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   console.log(this);
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
