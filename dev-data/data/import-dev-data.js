// THIS FILE USED TO IMPORT/DELETE FILES TO/FROM DATABASE
// It's just a hard-code file to import/delete files faster instead of calling "post" requests each document

// import dotenv to use env variables first
// ./ means the current directory;
// ../ means the parent of the current directory

const dotenv = require('dotenv');
const fs = require('fs');
const mongoose = require('mongoose');

const Tour = require('../../models/tourModel');
const Review = require('../../models/reviewModel');
const User = require('../../models/userModel');

dotenv.config({ path: './config.env' });

// 1) CONNECT TO DATABASE
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

// 2) READ JSON FILE, FORMAT IT INTO JSON, AND SAVE TO VARIABLE tours
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

// 3) IMPORT DATA INTO DATABASE
const importData = async () => {
  try {
    await Tour.create(tours);

    // {validateBeforeSave: false} ignore model validators
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data loaded');
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// 4) DELETE ALL DATA FROM COLLECTION
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data deleted');
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// 5) SET COMMAND LINE

// From cmd: "node dev-data/data/import-dev-data.js", process.argv returns the absolute paths of each part of the command:
/*
    [
    'C:\\Program Files\\nodejs\\node.exe', 
    'C:\\Users\\kietd\\Desktop\\starter\\dev-data\\data\\import-dev-data.js' 
    ]
*/

console.log(process.argv);

if (process.argv[2] === '--import') {
  // cmd: "node dev-data/data/import-dev-data.js --import"
  importData();
} else if (process.argv[2] === '--delete') {
  // cmd: "node dev-data/data/import-dev-data.js --delete"
  deleteData();
}
