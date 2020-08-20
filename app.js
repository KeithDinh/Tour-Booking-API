// import libraries
const express = require('express');

// morgan is a logger, display coming request info in the terminal (route, status code, time)
const morgan = require('morgan');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

console.log(`Running on ${process.env.NODE_ENV}`);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// express.json is a middleware Express added from body-parser, a function stands in btw to handle requests
app.use(express.json());

app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next(); // Next() tells app to move on the next middlewhere without being stuck
});

// ************** All routes
/* 
app.get('/api/v1/tours', getAllTours );
app.get('/api/v1/tours/:id', getTour);
app.post('/api/v1/tours', createTour);
app.patch('/api/v1/tours/:id', updateTour);
app.delete('/api/v1/tours/:id', deleteTour); 
*/

// shortcut
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

// Handler for all unhandled routes

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
