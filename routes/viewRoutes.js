const express = require('express');

const router = express.Router();
const viewController = require('../controllers/viewController');
const authController = require('./../controllers/authController');
const bookingController = require('../controllers/bookingController');

router.get('/', authController.isLoggedIn, viewController.getOverview);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);

// write a views route for signup form
router.get('/signup', authController.isLoggedIn, viewController.getSignupForm);
// operations are similiar in isLoggedIn and protect, so the me route
// will ony use protect
router.get('/me', authController.protect, viewController.getUserAccount);
router.post(
  '/submit-user-data',
  authController.protect,
  viewController.updateUserData
);

router.get('/my-tours', authController.protect, viewController.getMyTours);

module.exports = router;
