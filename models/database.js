const AWS = require('aws-sdk');
const req = require('express/lib/request.js');
const usr = require('./user.js');

AWS.config.update({
  region: 'us-east-1',
});

const db = new AWS.DynamoDB();

const scanUsers = (searchQuery, callback) => {
  if (searchQuery.length < 3) {
    console.log("Error! Search query too small");
    callback(403, "small", null);
  } else {
    const params = {
      FilterExpression: "contains(username, :query)",
      ExpressionAttributeValues: {
        ":query": {S: searchQuery}
      },
      TableName: "users"
    }

    db.scan(params, (err, data) => {
      if (err) {
        console.log(err);
        callback(500, err, null);
      } else {
        callback(201, err, data.Items.map(d => {
          return {username: d.username.S, 
            displayname: d.displayname ? d.displayname.S : d.username.S};
        }));
      }
    })
  }

}

const getFriends = (username, callback) => {
  let friends = [];

  db.query({
    TableName: "friends",
    KeyConditionExpression: "accepter = :username",
    ExpressionAttributeValues: {
        ":username": {S: username}
    }
  }, (err, data1) => {
    if (err) {
      callback(500, err, null);
    } else {
      db.query({
        TableName: 'friends',
        IndexName: 'asker-index',
        KeyConditionExpression: 'asker = :username',
        ExpressionAttributeValues: {
          ":username": {S: username}
        }
      }, (err, data2) => {
        if (err) {
          callback(500, err, null);
        } else {
          callback(201, err, [...data1.Items, ...data2.Items]);
        }
      })
    }
  });
}

const scanPosts = (username, callback) => {

}

const addFriend = (asker, accepter, callback) => {
  db.putItem({
    TableName: 'friends',
    Item: {
      accepter: {S: accepter},
      asker: {S: asker},
      status: {S: 'true'},
      timestamp: {S: (new Date()).toUTCString()}
    }
  }, (err, data) => {
    if (err) {
      callback(500, err, null);
    } else {
      callback(201, err, data);
    }
  });
}

const loginUser = (username, password, callback) => {
  db.query({
    ExpressionAttributeValues: {
      ':username': {S: username},
    },
    KeyConditionExpression: 'username = :username',
    TableName: 'users',
  }, (err, data) => {
    if (err) {
      console.log(err);
      callback(500, err, null);
    } else {
      let serverPassword = data.Items[0].password.S;
      if (password == serverPassword) {
        callback(201, err, data);
      } else {
        console.log(`Incorrect password: ${password}`);
        callback(401, err, null);
      }
    }
  })
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

const checkUsername = (username, skip, callback) => {
  if (skip){
    callback(201, null, null);
  } else {
    db.query({
      ExpressionAttributeValues: {
        ':username': {S: username},
      },
      KeyConditionExpression: 'username = :username',
      TableName: 'users',
    }, (err, data) => {
      if (err) {
        callback(500, err, null);
      } else if (data.Items.length > 0) {
        callback(401, "username", null);
      } else {
        callback(201, err, data);
      }
    });
  }
}

const checkEmail = (email, skip, callback) => {
  if (!skip) {
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
          callback(201, err, null);
        }
      }
    });
  } else {
    callback(201, null, null);
  }
}

const editUser = (user, isUsernameChanged, isEmailChanged, callback) => {
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
        if (data.Items.length > 0 && isUsernameChanged) {
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
              if (data.Items.length > 0 && isEmailChanged) {
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

// ACE HOUR
/**
 * @param {*} 
 * @param {*} callback callback function. Must have (code, error, data).
 *
 */
var findChats = function (username, callback) {
	// using username, query user data from table: users, get stringified list of chatrooms, return in array form to routes.js
	callback(null, null);
	// query for strigified list of chatrooms where each object has { roomid: roomid, creator: user.username, chatname}
	
	var params = {
	    ExpressionAttributeValues: {
	      ':username': {S: username},
	    },
	    KeyConditionExpression: 'username = :username',
	    TableName: 'users'
    };
    
    db.query(params, function(err, data) {
		if (err) {
	        callback(err, null);
	    } else if (data.Items.length == 0) {
			callback(null, []);
		} else {
			// console.log(JSON.parse(data.Items[0].chatrooms.S));
			callback(null, data.Items[0].chatrooms.S);
		}
    });
}

const addChatToTable = (user, callback) => {
	// using username, query user data from table: users, get stringified list of chatrooms, return in array form to routes.js
	
	// callback: (chatinfo, err, data)
}

const displayFriends = (user, callback) => {
	// display list of friends, called when click on invite friend button
}

const addFriendToChat = (friend, callback) => {
	// add given friend 
}

const viewOneChat = (chatid, callback) => {
	// return chat info & messages
}

// end of ACE HOUR

const database = {
  // queryUser: queryUser,
  createUser: createUser,
  editUser: editUser,
  loginUser: loginUser,
  scanUsers: scanUsers,
  
  addFriend, addFriend,
  getFriends: getFriends,
  
  findChats: findChats,
  newChat: addChatToTable,
  viewFriends: displayFriends,
  addFriendToChat: addFriendToChat,
  viewChat: viewOneChat, 
  
}

module.exports = database;
