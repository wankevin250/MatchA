const AWS = require('aws-sdk');
const usr = require('./user.js');

AWS.config.update({
  region: 'us-east-1',
});

const db = new AWS.DynamoDB();

const queryUser = (username, password, callback) => {
  const params = {
    KeyConditionExpression: "username = :username",
    ExpressionAttributeValues: {
      ":username": {S: username},
    },
    ProjectionExpression: "username, password, fullname",
    TableName: "users",
  };
  
  db.query(params, function(err, data) {
    if (err) {
      console.log("Error", err);
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
}

/**
 * Creates user in DynamoDB table for users.
 * @param {*} user user object. See users.js
 * @param {*} callback callback function. Must have (code, error, data).
 * 
 * Code = HTML error code; 200 = successful; 400 = user error; 500 = server error
 * Error = Server error message
 * Data = Real data
 */
const createUser = (user, callback) => {
  if (usr.checkUser(user)) {

    let item = {};
    Object.entries(user).forEach((key, val) => {
      item[key] = {S: val};
    });

    const params = {
      Item: item,
      TableName: 'users',
    };
    
    // put to database. respond with no data if server error.
    db.putItem(params, (err, data) => {
      if (err) {
        console.log("Error", err);
        callback(500, err, null);
      } else {
        callback(200, err, data);
      }
    });
  } else {
    callback(400, null, null);
  }
}

const database = {
  queryUser: queryUser,
  createUser: createUser,
}

module.exports = database;