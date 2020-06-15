const { promises: fs } = require('fs');

const multer = require('multer');
const sharp = require('sharp');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const User = require('./../models/userModel');
const AppError = require('./../utils/appError');
const handlerFactory = require('./handlerFactory');

// configure multer upload, specifying the destination where uploaded
// images will be saved.
// Recap: Images are not directly uploaded to the Database!!! We just
// upload them into our file system and in the DB we put a link to the
// image (in each user document we will have a name of uploaded file)
// before the file is processed we will store it in memory rather than
// a disk

// const multerStorage = multer.diskStorage({
//   destination: (req, file, callBack) => {
//     callBack(null, 'public/img/users');
//   },
//   filename: (req, file, callBack) => {
//     // user-id-timestamp.jpg - ensure uniqueness of filenames
//     const extension = file.mimetype.split('/')[1];
//     callBack(null, `user-${req.user.id}-${Date.now()}.${extension}`);
//   }
// });

// this way the image will be stored as a buffer:
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

exports.uploadUserPhoto = upload.single('photo');

// delete old user photo
exports.deleteOldPhoto = catchAsync(async (req, res, next) => {
  const filesInDir = await fs.readdir('public/img/users');
  let result;
  filesInDir.forEach(async file => {
    if (file.includes(req.user.id)) {
      result = await fs.unlink(`public/img/users/${file}`);
    }
  });
  console.log(result);
  next();
});

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  // if there was an upload, we have a file on request, so if no file
  // on req, return and go to next, else we do image resizing, - sharp
  // package - img processing library
  if (!req.file) return next();

  // we realy on this property for saving to db, and with
  // memoryStorage the proeprty is not defined, so we take care of this:
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  // this will return a promise so we need to await? YES - before
  // calling next()
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next(); //call the updateMe middleware
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

// we will ad this middleware before calling getOne so in teh case of
// /me endpoint user id will be red from the logged in user:
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// for updating the currently authenticated user
exports.updateMe = catchAsync(async (req, res, next) => {
  // updating usr data and password data will be two separate routes
  // so if user posts password data to this route, we respond with an
  // error
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /update-my-password',
        400
      )
    );
  }

  // create a filtered body of incomming request to prevent harmful
  // updates from user side: such as the user setting his role to
  // 'admin'
  const filteredBody = filterObj(req.body, 'name', 'email');
  // additional if to check if file is being attached to request, and
  // if so, add the filename to filtered body, photo field to the
  // object that will be updated:
  // BUT, new users may not provide photo right away, so we need to
  // ensure a default in such cases - see userModel, 'photo' field
  if (req.file) filteredBody.photo = req.file.filename;
  console.log(filteredBody);
  console.log(req.body.email);

  console.log(req.user.id);

  // update user document
  // findbyidandupdate is ok to use here since we dont need pre-save middleware
  // for processing passwords n shit
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// 🏵🏵🏵🏵🏵🏵🏵🏵
// controller function to delete/deactivate user from his/her acc
exports.deleteMe = catchAsync(async (req, res, next) => {
  // the route will check if user is authenticated and logged in
  // (protect function), so we should have a user obj attached to
  // req.user
  // console.log('in delete me middleware');

  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: {}
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined and never will be - USE /signup!'
  });
};

// this route is not for changing passwords, because its using
// findbyidandupdate instead of save
exports.getAllUsers = handlerFactory.getAll(User);
exports.getUser = handlerFactory.getOne(User);
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User); //only admin should be able to do this!
