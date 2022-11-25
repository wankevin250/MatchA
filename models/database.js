const AWS = require('aws-sdk');

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

const createUser = (user, callback) => {
  
}

const database = {
  queryUser: queryUser,
}

module.exports = database;