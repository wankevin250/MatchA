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
    Object.entries(user).forEach(entry => {
      let [key, val] = entry;
      item[key] = {S: val};
    });

    db.query({
      ExpressionAttributeValues: {
        ':username': {S: user.username},
      },
      KeyConditionExpression: 'username = :username',
      TableName: 'users',
    }, (err, data) => {
      if (err) {
        console.log(err);
        callback(500, err, null);
      } else {
        if (data.Items.length > 0) {
          callback(403, "username", null);
        } else {
          db.query({
            ExpressionAttributeValues: {
              ':email': {S: user.email},
            },
            KeyConditionExpression: 'email = :email',
            TableName: 'users',
            IndexName: 'email'
          }, (err, data) => {
            if (err) {
              console.log(err);
              callback(500, err, null);
            } else {
              if (data.Items.length > 0) {
                callback(403, 'email', null);
              } else {          
                // put to database. respond with no data if server error.
                db.putItem({
                  Item: item,
                  TableName: 'users',
                }, (err, data) => {
                  if (err) {
                    console.log("Error", err);
                    callback(500, err, null);
                  } else {
                    callback(201, err, data);
                  }
                });
              }
            }
          });
        }
      }
    });
  } else {
    callback(401, null, null);
  }
}

const findChats = (user, callback) => {
	
}

const database = {
  queryUser: queryUser,
  createUser: createUser,
  findChats: findChats,
  
}

module.exports = database;
