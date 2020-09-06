const path = require('path');
// import libraries
const express = require('express');

// morgan is a logger, display coming request info in the terminal (route, status code, time)
const morgan = require('morgan');

// prevent same IP from making too many requests, denial of service or brute force attacks. It counts the number of requests coming from one IP, and if too many requests, it will lock the IP
const rateLimit = require('express-rate-limit');

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize'); // prevent injecting query in req
const xss = require('xss-clean'); // prevent injecting html js in req
const hpp = require('hpp'); // http parameter pollution

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();
app.set('view engine', 'pug');
app.set('views', './views');
// 1) GLOBAL SECURITY MIDDLEWARES

// set security http headers
app.use(helmet());

// Development Logging
if (process.env.NODE_ENV === 'development') {
  console.log(`Running on ${process.env.NODE_ENV}`);
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100, // 100 requests on the same IP
  windowMs: 60 * 60 * 1000, // one hour to milliseconds
  message: 'Too many requests from this IP, please try again in an hour!',
});

// use rateLimit on every route start with /api, when the app is crashed, rateLimit will be reset
app.use('/api', limiter);

// express.json is a middleware Express added from body-parser, a function stands in btw to handle requests, read data from body to req.body
app.use(express.json({ limit: '10kb' })); // limit the data

// Data sanitization against NoSQL query injection
/* example of query injection: log in by 
{
  "email" : {"$gt" : ""},
  "password": "pass1234"
} 
*/
app.use(mongoSanitize());
// Data Sanitization against XSS, prevent attackers from injecting malicious HTML + Js code to attach to our site
app.use(xss());

// Prevent parameter pollution
/* Ex: instead of ?sort=-price,ratingsAverage, 
attackers may use: ?sort=-price&sort=ratingsAverage 
This allowes them to look at the errors that developer didn't cover (use AppError) 
Using hpp, Mongo will take the last value of "sort" */
app.use(
  hpp({
    // array of properties allowed to be duplicate
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// 2) GLOBAL MIDDLEWARES

// static files
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next(); // Next() tells app to move on the next middlewhere without being stuck
});

// 3) GLOBAL ROUTES
/* A basic method to create route. We'll use a more complex version in routes folder
app.get('/api/v1/tours', getAllTours );
app.get('/api/v1/tours/:id', getTour);
app.post('/api/v1/tours', createTour);
app.patch('/api/v1/tours/:id', updateTour);
app.delete('/api/v1/tours/:id', deleteTour); 
*/

// Shortcut route, Ex: routes from tourRouter will begin with '/api/v1/tours'
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// 3) HANDLER UNHANDLED ROUTES

// This route must be written last to avoid being called before other existing routes execute
app.all('*', (req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  /* 
    When pass an arg to 'next()', it's always considered as 'error'
    The 'next(err)' skips all other middlewares and execute the one
    that has the 'err' arg
  */
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// when pass an arg to next(), it provokes the middleware globalErrorHandler (err, req, res, next)
app.use(globalErrorHandler);
module.exports = app;
