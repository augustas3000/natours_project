// app.js is typically where express is configured
const path = require('path');
const express = require('express'); //require express module
const morgan = require('morgan'); //module for reporting purposes
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

// before deployment need to compress servers responses to the client:
// we will need this middleware:
const compression = require('compression');

// for enable cors:
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingsRouter = require('./routes/bookingRoutes');
// start express app:
const app = express(); //create an app object from express module

// trust proxies - for secure cookie sending
app.enable('trust proxy');

// set the templating engine for SSR, in this case - Pug:
// no need for imports as express automatically supports common
// engines like Pug.
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// app.get('/', (req, res) => {
//   res.status(200).send('Hello this a response from server side!');
// });

// 1) GLOBAL MIDDLEWARES

// implement CORS
// this midware will add specific headers on incopmming requests to enable CORS
app.use(cors()); //only allows simple requests - get, post, but we also want put patch del
// also we want requests that send cookies or non-standard headers:
// optuions is just another http method we can respond to
app.options('*', cors());

// also possible for specific routess:
// app.options('/api/v1/tours/:id', cors()); - only on specif route we
// allow pre-flight requests

// what if our api and the front end were on different domains:
// api.natours.com, natours.com, if we only wanted to allow acces from
// natours.com (frontend), we would do something like this:
// app.use(
//   cors({
//     origin: 'https://www.natours.com' //only this origin would be allowed to make requests to api server
//   })
// );

//    serving static files - all static files will be served from
//    folder - public, like css n shit
app.use(express.static(path.join(__dirname, 'public')));

// apply helmet - set secuirity http headers
app.use(helmet());

// development logging with morgan
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// allow max 100 reqs from the same ip per hour - limiter
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this ip, please try again in an hour'
});
// apply limiter to a route
app.use('/api', limiter);

// body parser - reading data from the body into req.body
app.use(
  express.json({
    limit: '10kb' //bodies larger than 10kb wont be accepted
  })
);
// cookie parser -reading data from cookies into req.cookies
app.use(cookieParser());

// express middleware to read data posted from forms:
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// sanitize data: against nosql injection
app.use(mongoSanitize());
// sanitize data: against XSS attacks
app.use(xss());

// parameter pollution - prevent parameter polution such as duplicates
// should be used at the end because it clears up the query string
// need to whitelist some params to allow some logical queries
// like duratio=5&duration=2
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// compress the response we send to the client
app.use(compression());

// test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers); to see how req header look
  // console.log(req.cookies);

  next();
});

// 3.0 - VIEWS ROUTES:  ⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️
app.use('/', viewRouter);

// 3) API ROUTES
//    if we only wanted cors to be enabled on specific route we could
//    do something like this instead:
// app.use('/api/v1/tours', cors(), tourRouter);

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingsRouter);

// when a user hits a url that is not defined, we handle the
// operational error by sending a response. but the goal is to do that
// in one central place.

app.all('*', (req, res, next) => {
  // by default we create an error like this: const err = new
  // Error(eror message); err.status = 'fail', err.statusCode = 404.
  // but we created a custom AppErr class that inherits from Error
  // class, to add some more functionality if next function receives
  // an argument, no matter what it is, express will think its an
  // error if this happens, express skips all midware in midware
  // stack, and send errror to global error handling middleware, which
  // will be executed.
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// to define an error handlin middleware, we need to give the function four arguments
// and express will recognize that as error handling middleware, only calling it when there
// is an error. - see errorController.js
app.use(globalErrorHandler);

module.exports = app;
