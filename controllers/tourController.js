const Tour = require('../models/tourModel');

// using high-order function to avoid repeat try/catch block for each handler
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');

const factory = require('./handlerFactory');

/*
Original try/catch block
exports.createTour = async (req, res) => {
  try {
    // do something
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error,
    });
  }
};
*/

// checkID & checkBody is implemented in tourControllerForLocalFile
//  It is removed because MongoDB auto assigns and validate ID

// *(req,res): route handler
// *req.params: route parameters (after the / with colon : in the URL)
// *req.query: the URL query parameters (after the ? in the URL)
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   // BUILD QUERY
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter().sort().limitFields().paginate();

//   // EXECUTE QUERY
//   const tours = await features.mongoModelQuery;

//   // SEND RESPONSE
//   res.status(200).json({status: 'success',results: tours.length,data: {tours,},});});
exports.getAllTours = factory.getAll(Tour);

exports.aliasTopTours = async (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// exports.getTour = catchAsync(async (req, res, next) => {
//   // populate('guides'): display referenced data only on query
//   const tour = await Tour.findById(req.params.id).populate('reviews');
//   // alternative: Tour.findOne({_id: req.params.id})
//   if (!tour) { return next(new AppError(`No tour found with that ID`, 404));}
//   res.status(200).json({status: 'success',data: {tour,},});});
exports.getTour = factory.getOne(Tour, { path: 'review' });

// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({ status: 'success',data: {tour: newTour,},});});
exports.createTour = factory.createOne(Tour);

// exports.updateTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {  new: true, runValidators: true, // true: when there is an update, mongoose.Schema will recheck the validator  });
//   res.status(200).json({ status: 'success',  data: {  tour,  }, }); });
exports.updateTour = factory.updateOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);
//   if (!tour) {return next(new AppError(`No tour found with that ID`, 404)); }
//   res.status(204).json({  status: 'success',  data: null, }); });
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, // what we want to group by, null by default is the match. $toUpper -> uppercase
        numTours: { $sum: 1 }, // for each document, 1 will be added to counter
        numRatings: { $sum: '$ratingsQuantity' }, // $operation: '$name of field'
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 }, // 1 is descending
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      // If a document has a property with 3 values, unwind will convert to 3 documents with same property but has only 1 value each
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }, // list all the elements
      },
    },
    {
      $addFields: {
        month: '$_id', // add field
      },
    },
    {
      $project: {
        _id: 0, // hide this field
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 6,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// Ex from Google: /tours-within/23/center/29.7410991,-95.3627635/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // convert radius to radian, Earch's radius: 3963.3 mi, 6378.1 km
  const radius = unit === 'mi' ? distance / 3963.3 : distance / 6378.1;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }
  // in Mongo geospatial, longtitude then latitude
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  console.log(distance, lat, lng, unit);
  res.status(200).json({
    status: 'success',
    result: tours.length,
    data: tours,
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  // the distance by default will result in meter
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier, // this converts to kilometer
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: distances,
  });
});
