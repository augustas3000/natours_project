const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
// const APIFeatures = require('./../utils/apiFeatures');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const handlerFactory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, callBack) => {
  // test if uploaded file is an image
  if (file.mimetype.startsWith('image')) {
    callBack(null, true);
  } else {
    callBack(
      new AppError('Not an image. Please upload only images.', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();
  // process cover image:
  const imageCoverFileName = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${imageCoverFileName}`);
  // these fields will be used to update the tour document in the
  // next middleware - updateTour
  req.body.imageCover = imageCoverFileName;
  // process all tour images
  req.body.images = [];

  // right now we are not awaiting any of this, because async await
  // happens inside of the callback function of one of these loop
  // methods so use map method instead which will return an array of
  // promises, and right away use Promise.all

  await Promise.all(
    req.files.images.map(async (file, index) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${index + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  console.log(req.body);
  
  // call udate tour middleware
  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = handlerFactory.getAll(Tour);
exports.getTour = handlerFactory.getOne(Tour, { path: 'reviews' });
exports.createTour = handlerFactory.createOne(Tour);
exports.updateTour = handlerFactory.updateOne(Tour);
exports.deleteTour = handlerFactory.deleteOne(Tour);

// aggregation pipeline:
// mongo db framework for data aggregation:
// define a pipeline where all the documents from a certain collection
// go through where the yare processed step by step in order to
// transform them into aggregated results - calc avgs, min, max ,
// distances, all kinds of statistics

exports.getTourStats = catchAsync(async (req, res, next) => {
  // the aggregation pipeline is a bit like regular query.
  // but in aggregation queries, we can manipulate data using couple
  // different steps - STAGES
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } } //stage 1 - select documents by critetia
    },
    {
      // group stage:Groups input documents by the specified _id
      // expression and for each distinct grouping, outputs a
      // document. The _id field of each output document contains the
      // unique group by value. The output documents can also contain
      // computed fields that hold the values of some accumulator
      // expression.

      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 }, //to add all tours together weuse sum: and 1, as in 1 - for each document
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // id is now difficulty, as specified by first stage match
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

// calculate the busiest month of a given year:
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    {
      //Deconstructs an array field from the input documents to output
      //a document for each element. Each output document is the input
      //document with the value of the array field replaced by the
      //element.

      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' }, //extract the month of the date
        numTourStarts: { $sum: 1 }, //count how many tours happen in the grouped month
        tours: { $push: '$name' } //push referenced tours names to array
      }
    },
    {
      $addFields: { month: '$_id' } //add another field for month
    },
    {
      $project: {
        _id: 0 //remove original _id field
      }
    },
    {
      $sort: { numTourStarts: -1 } //sort by tour num startign highes - descending
    },
    {
      $limit: 12 //limit number of documents
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  // extract the params from req.params using destructuring
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // to get radians - distance(radius)/radius of center of teh earth?
  // if miles then convert, else assume meters:
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError('Please provide lat and long in the format lat,lng', 400)
    );
  }

  // query time: - essential to add index to startLocation:
  const toursFound = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: toursFound.length,
    data: {
      data: toursFound
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  // extract the params from req.params using destructuring
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    next(
      new AppError('Please provide lat and long in the format lat,lng', 400)
    );
  }

  const multiplier = unit === 'mi' ? 0.00062137 : 0.001;

  const distances = await Tour.aggregate([
    // geoNear always needs to be the first stage, geoNear requires
    // that at least one of the fields has geospatial index, which we
    // added to startLocation
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: {
      data: distances
    }
  });
});
