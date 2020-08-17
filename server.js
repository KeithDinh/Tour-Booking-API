// import dotenv to load new env variables in config.env first
// *dotenv is a zero-dependency module that loads env variables from a .env file into process.env
const dotenv = require('dotenv');
const mongoose = require('mongoose');

/* When uncaught exception (SYNCHRONOUS) occurs, crash (shut down) the application is NECCESSARY
because the node will be in the unclean state. The process need to terminate to fix it
*/
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION!! Shutting down...');

  // the errors are synchronous, so no need to wait for the server to close
  process.exit(1); // 0 stands for success, 1 stands for uncaught exception
});

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true, //fix some warnings
  })
  .then(() => {
    console.log('DB connection successful!');
  });
// .catch((err) => console.log('ERROR'));

// after getting the env variables
const app = require('./app');

// ************** Start server
// console.log(process.env);
const port = process.env.PORT || 8000;

// save the server to a variable
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

/* Each time there's an unhandled rejection (ASYNCHRONOUS) in the app,
the process object will emit an object called unhandled rejection,
we can subcribe to that event. Crash(shut down) the application is OPTIONAL
*/
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION!! Shutting down...');

  // close the server first to have time finish all requests, then shut down
  server.close(() => {
    process.exit(1); // 0 stands for success, 1 stands for uncaught exception
  });
});
