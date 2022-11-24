const AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-east-1',
});

const db = new AWS.DynamoDB();

const queryUser = (username, password, callback) => {
  
}

const database = {
  queryUser: queryUser,
}

module.exports = database;