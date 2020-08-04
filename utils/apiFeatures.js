class APIFeatures {
  constructor(query, queryString) {
    this.mongoModelQuery = query; // Mongo query (Tour.find())
    this.reqQuery = queryString; // query comes from the express route
  }

  filter() {
    // parse objects to get each query param
    const queryObj = { ...this.reqQuery };

    // exclude these fields because of future features such as pagination, sorting algorithm, etc.
    const excludedFields = ['page', 'sort', 'limit', 'fields'];

    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced Filtering
    // *JSON.stringify() converts a JavaScript object or value to a JSON string
    // *JSON.parse() parses a JSON string, constructing the JavaScript value or object described by the string
    let queryStr = JSON.stringify(queryObj); // from { difficulty: 'easy', price: { gte: '500' } } to {"difficulty":"easy","price":{"gte":"500"}}

    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // from {"difficulty":"easy","price":{"gte":"500"}} to {"difficulty":"easy","price":{"$gte":"500"}}

    this.mongoModelQuery = this.mongoModelQuery.find(JSON.parse(queryStr));
    // let query = Tour.find(JSON.parse(queryStr));

    return this; // return the entire object
  }

  sort() {
    if (this.reqQuery.sort) {
      const sortBy = this.reqQuery.sort.split(',').join(' ');
      // query = query.sort(sortBy);
      this.mongoModelQuery = this.mongoModelQuery.sort(sortBy);
    } else {
      // query = query.sort('-createdAt');
      this.mongoModelQuery = this.mongoModelQuery.sort('-createdAt');
    }

    return this; // return the entire object
  }

  limitFields() {
    if (this.reqQuery.fields) {
      const fields = this.reqQuery.fields.split(',').join(' ');
      this.mongoModelQuery = this.mongoModelQuery.select(fields);
    } else {
      // The minus "-" before __v in mongoose means "exclude" and in req.query means"descending"
      this.mongoModelQuery = this.mongoModelQuery.select('-__v');
    }

    return this; // return the entire object
  }

  paginate() {
    // Ex: page=2&limit=10, page 1: 1-10, page 2: 11-20, etc.
    // For user, it's simpler to have only "page" without the need of "limit", so the value of "skip" will be hard-coded

    const page = +this.reqQuery.page || 1; // default will be 1
    const limit = this.reqQuery.limit * 1 || 100; // either "+" or "*1" to convert to int

    // if request page 1, "skip" must be "0" => minus 1
    const skip = (page - 1) * limit;
    this.mongoModelQuery = this.mongoModelQuery.skip(skip).limit(limit);

    return this; // return the entire object
  }
}
module.exports = APIFeatures;
