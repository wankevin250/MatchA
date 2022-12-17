const AWS = require('aws-sdk');
const req = require('express/lib/request.js');
const usr = require('./user.js');
const {v4 : uuidv4} = require('uuid')

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

const queryFriendInvites = (accepter, status, callback) => {
  db.query({
    TableName: 'friends',
    KeyConditionExpression: 'accepter = :accepter',
    ExpressionAttributeValues: {
      ':accepter': {S: accepter},
      ':status': {S: status},
    },
    ExpressionAttributeNames: {
      '#status': {S: 'status'}
    },
    FilterExpression: '#status = :status',
  }, (err, data) => {
    if (err) {
      callback(500, err, null);
    } else {
      callback(500, err, data.Items);
    }
  });
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

const queryPosts = (userwall, callback) => {
  db.query({
    TableName: 'posts',
    KeyConditionExpression: "userwall = :userwall",
    ExpressionAttributeValues: {
      ':userwall': {S: userwall}
    }
  }, (err, data) => {
    if (err) {
      callback(500, err, null);
    } else {
      callback(201, err, data);
    }
  });
}

const sendFriendRequest = (asker, accepter, callback) => {
  db.query({
    TableName: 'users',
    KeyConditionExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': {S: asker}
    }
  }, (err, data) => {
    if (err) {
      callback(500, err, null);
    } else {
      let askerUser = data.Items[0];
      let rPrev = askerUser.sentRequests;
      let item = {};
      askerUser.sentRequests = rPrev ? JSON.stringify(JSON.parse(rPrev).append(accepter)) 
        : JSON.stringify([].append(accepter));

      Object.entries(askerUser).forEach(entry => {
        let [key, val] = entry;
        item[key] = {S: val};
      });
      db.putItem({
        TableName: 'users',
        Item: item,
      }, (err, data) => {
        if (err) {
          callback(500, err, null);
        } else {
          db.putItem({
            TableName: 'friends',
            Item: {
              accepter: {S: accepter},
              asker: {S: asker},
              status: {S: 'false'},
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
      });
    }
  })
}

// const addFriend = (asker, accepter, callback) => {

//   db.putItem({
//     TableName: 'friends',
//     Item: {
//       accepter: {S: accepter},
//       asker: {S: asker},
//       status: {S: 'false'},
//       timestamp: {S: (new Date()).toUTCString()}
//     }
//   }, (err, data) => {
//     if (err) {
//       callback(500, err, null);
//     } else {
//       callback(201, err, data);
//     }
//   });
// }

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

const addChatToTable = (chatdata, callback) => {
	// using username, query user data from table: users, get stringified list of chatrooms, return in array form to routes.js
	// callback: (status, err, data)
	if (chatdata != null) {
		let userlist = [chatdata.creator];
		let item = { 
			'roomid': {S: chatdata.roomid}, 
			'creator': {S: chatdata.creator},
			'users': {S: JSON.stringify(userlist)}, 
			'chatname': {S: chatdata.chatname}
			};
		
		// db.query to check if already existing using this id, if so generate new id
		var params = {
		    ExpressionAttributeValues: {
		      ':roomid': {S: chatdata.roomid},
		    },
		    KeyConditionExpression: 'roomid = :roomid',
		    TableName: 'chatrooms'
		};
		
		db.query(params, function(err, data) {
			if (err) {
				callback(500, err, null);
			} else if (data.Items.length == 0) {
				db.putItem( {'TableName': "chatrooms", 'Item': item}, function(err, data) {
					if (err) {
						callback(500, err, null);
					} else {
						console.log(addChatHelper(chatdata.creator, chatdata.roomid, chatdata.chatname));
						let itemret = { roomid: chatdata.roomid, chatname: chatdata.chatname};
						callback(200, err, itemret);
						/** 
						if (addChatHelper(chatdata.creator, chatdata.roomid, chatdata.chatname) == 0) {
							let itemret = { roomid: chatdata.roomid, chatname: chatdata.chatname};
							callback(200, err, itemret);
						} else {
							callback(500, err, null);
						} */
					}
				});
			} else {
				// generate uuid
				let newid = uuidv4();
				let refresheditem = {
					'roomid': {S: newid},
					'creator': {S: chatdata.creator},
					'users': {S: JSON.stringify(userlist)}, 
					'chatname': {S: chatdata.chatname}
				};
				
				db.putItem( {'TableName': "chatrooms", 'Item': refresheditem}, function(err, data) {
					if (err) {
						callback(500, err, null);
					} else {
						console.log(addChatHelper(chatdata.creator, newid, chatdata.chatname));
						let itemreturn = { roomid: newid, chatname: chatdata.chatname};
						callback(200, err, itemreturn);
						/**
						if (addChatHelper(chatdata.creator, newid, chatdata.chatname) != 0) {
							let itemreturn = { roomid: newid, chatname: chatdata.chatname};
							callback(200, err, itemreturn);
						} else {
							callback(500, err, null);
						} */
					}
				});
			}
		})
		
	} else {
		callback(400, null, null);
	}
}

var addChatHelper = function (username, chatid, chatname) {
	console.log(username);
	
	var params = {
	    ExpressionAttributeValues: {
	      ':username': {S: username},
	    },
	    KeyConditionExpression: 'username = :username',
	    TableName: 'users'
    };
	
	db.query(params, function(err, data) {
		if (err) {
			console.log(err);
			return -1;
		} else if (data.Items.length == 0) {
			console.log("no such user");
			return -1;
		} else {
			let newarr = [];
			
			if (data.Items[0].chatrooms != null && data.Items[0].chatrooms.S != "") {
				newarr = JSON.parse(data.Items[0].chatrooms.S);
			}
			
			newarr = newarr.concat({roomid: chatid, chatname: chatname});
			
			var newarrstring = JSON.stringify(newarr);
			
			let listparams = {
				TableName: 'users',
                Key: {
                    username: {
                        'S': username
                    }
                },
                UpdateExpression: "SET chatrooms = :newchatrooms",
                ExpressionAttributeValues: {
					":newchatrooms": {S: newarrstring},
				},
				ReturnValues: "UPDATED_NEW",
			};
			
			db.updateItem(listparams, function(err, data) {
				if (err) {
					console.log(err)
					return -1;
				} else {
					return 0; // success!
				}
			});
		}
	})
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


// start of Sebin News
const computeRank = (user, callback) => {
	// using username as an input for run, execute the whole rankJob.class
	var exec = require('child_process').exec;
  
  exec('mvn exec:java@ranker' + ' -Dexec.args=' + user.username,
    function (error, stdout, stderr) {
        console.log('stdout: ' + user.username);
        //console.log('stderr: ' + stderr);
        if (error !== null) {
           // console.log('exec error: ' + error);
            callback(error, null);
        } // 이 안으로 들여오기  밑에 코드
    });

    console.log("ran exec");

    db.query({
      ExpressionAttributeValues: {
        ':username': {S: user.username},
        //':maxrank': {N: 10}
      },
      KeyConditionExpression: 'username = :username', // and rank <= :maxrank',
      TableName: 'newsRanked'
    }, (err, data) => {
      if (err) {
        callback(err, null);
      } else {
        if (data.Items.length > 0) {
          callback(null, data.Items);
        } else {        
           callback(null, data.Item);  
        }
      }
    });
}

const fetchNewsData = (headlines, callback) => {
  var result = [];
  var results = [];
  var promises = [];
  
  for (let i = 0; i < headlines.length; i++) {
   var params = {
    ExpressionAttributeValues: {
      ':headline': {S: headlines[i]},
    },
    KeyConditionExpression: 'headline = :headline',
    TableName: 'newsData'
  };
   
    let prom = db.query(params).promise(); // making array of promises
    promises.push(prom);
 }
  
  Promise.all(promises).then (
   data => {
     for (let i = 0; i < data.length; i++) {
       if (data[i].length != 0) {
        result = data[i].Items; // or Items[0]?
        results.push(result);
       }
     }
   },
   err => {
    callback(err, null);
   } 
 )
  callback(null, results);
}

const findNews = (keyword, callback) => {
  //var docClient = new AWS.DynamoDB.DocumentClient();
  var result =[];
  var promises = [];

  for (let i = 0; i < arr.length; i++) {
    searchWord = keyword[i];
    searchWord = searchWord.toLowerCase(); // change the search word into lowercase letter
      if (!(searchWord == ("a") || searchWord == ("all") || searchWord == ("any") || searchWord == ("but") || searchWord == ("the"))) { //filter the words
          searchWord = stemmer(searchWord); //stem the word
          var params = {
        TableName : "tokenizedNews",
        Limit : 15,
        ExpressionAttributeValues : {
          ':k' : searchWord
        },
        KeyConditionExpression : 'keyword = :k',
        };
        
        let prom = db.query(params).promise(); //create promise for each talk id
        promises.push(prom);
      }
    } 

    db.query({
      ExpressionAttributeValues: {
        ':keyword': {S: keyword},
      },
      KeyConditionExpression: 'keyword = :keyword',
      TableName: 'tokenizedNews'
    }, (err, data) => {
      if (err) {
        callback(err, null);
      } else {
        if (data.Items.length > 0) {
          callback(null, data.Items);
        } else {        
           callback(null, data.Item);  
        }
      }
    });
}

const database = {
  // queryUser: queryUser,
  createUser: createUser,
  editUser: editUser,
  loginUser: loginUser,
  scanUsers: scanUsers,
  
  sendFriendRequest: sendFriendRequest,
  getFriends: getFriends,
  queryFriendInvites: queryFriendInvites,

  queryPosts: queryPosts,
  
  findChats: findChats,
  newChat: addChatToTable,
  viewFriends: displayFriends,
  addFriendToChat: addFriendToChat,
  viewChat: viewOneChat, 

  computeRank:  computeRank,
  fetchNewsData: fetchNewsData,
  
}

module.exports = database;
