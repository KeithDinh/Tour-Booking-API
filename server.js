// import dotenv to load new env variables in config.env first
// *dotenv is a zero-dependency module that loads env variables from a .env file into process.env
const dotenv = require('dotenv');
const mongoose = require('mongoose');

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

// after getting the env variables
const app = require('./app');

// ************** Start server
// console.log(process.env);
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
