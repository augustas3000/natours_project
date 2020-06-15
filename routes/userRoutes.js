const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

// signuo does not fit the REST architecture
// but thats ok for auth purposes
// its not the admin that will signup a user but the usre itself
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword); //receive email address
router.patch('/reset-password/:token', authController.resetPassword); //receive token as well as new pass
// this will protect all the routes that com after this point, because
// router is like a small application
router.use(authController.protect);

router.patch('/update-my-password', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
// on this route we will also allow users to upload their photos,
// using multer - middlewaare package to work with multipart data:
// single - we only want to upd one single img, and into single we
// passs teh name of the field that is going to hold the name of the
// image we upload, that will be 'photo' - the field in the form that
// si going to be uuplaoding the image: so this middware will then
// take care of taking the file and copying it to specified
// destination and finally call next middware in teh stack, putting
// info about the file on teh request obejct

// also we will use another piece of middleware to process the image
// so its of reasonable resolution and square
router.patch(
  '/update-my-details',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

router.delete('/delete-my-account', userController.deleteMe);

// restrick the below routes to admins only:
router.use(authController.restrictTo('admin'));

// fits REST architecture where the name of the url
// does not imply anything about the action that is performed
// these are largely for system administrator to work with:
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser); //  user creation through this route will be prevented

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
