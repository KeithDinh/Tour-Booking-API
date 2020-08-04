// import dotenv to use env variables first
// ./ means the current directory;
// ../ means the parent of the current directory

const dotenv = require('dotenv');
const fs = require('fs');
const mongoose = require('mongoose');

const Tour = require('../../models/tourModel');

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

// READ JSON FILE, FORMAT IT INTO JSON, AND SAVE TO VARIABLE tours
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8')
);

// IMPORT DATA INTO DATABASE
const importData = async () => {
  try {
    await Tour.create(tours);
    console.log('Data loaded');
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// DELETE ALL DATA FROM COLLECTION
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    console.log('Data deleted');
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// From cmd: "node dev-data/data/import-dev-data.js"
// process.argv return:
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
