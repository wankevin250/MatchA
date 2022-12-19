const AWS = require('aws-sdk');
const usr = require('./user.js');
const {v4 : uuidv4} = require('uuid')

AWS.config.update({
  region: 'us-east-1',
});

const db = new AWS.DynamoDB();

const parseJSONwithS = (jsonstring) => {
  return jsonstring.S && jsonstring.S.length > 0
   ? JSON.parse(jsonstring.S) : [];
}

const cleanDataItems = (dataItems) => {
  let itemArr = [];
  dataItems.forEach(item => {
    let newitem = {};
    Object.entries(item).forEach(entry => {
      let [key, val] = entry;
      newitem[key] = Object.values(val)[0];
    });
    itemArr.push(newitem);
  });
  return itemArr;
}

const scanNewsCategories = (callback) => {
  db.scan({
    TableName: 'newsCount',
  }, (err, data) => {
    if (err) {
      console.log(err);
      callback(500, err, null);
    } else {
      callback(201, err, cleanDataItems(data.Items));
    }
  });
}

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

const queryRequests = (accepter, status, callback) => {
  db.query({
    TableName: 'requests',
    KeyConditionExpression: 'accepter = :accepter',
    ExpressionAttributeValues: {
      ':accepter': {S: accepter},
    },
  }, (err, data) => {
    if (err) {
      console.log(err);
      callback(500, err, null);
    } else {
      console.log(data.Items);
      let requests = data.Items.filter(d => d.status.BOOL == status);
      callback(201, err, cleanDataItems(requests));
    }
  });
}

// const queryFriendInvites = (accepter, status, callback) => {
//   db.query({
//     TableName: 'friends',
//     KeyConditionExpression: 'accepter = :accepter',
//     ExpressionAttributeValues: {
//       ':accepter': {S: accepter},
//     },
//   }, (err, data) => {
//     if (err) {
//       console.log(err);
//       callback(500, err, null);
//     } else {
//       console.log(data.Items);
//       let requests = data.Items.filter(d => d.status.S == "false");
//       callback(201, err, requests);
//     }
//   });
// }

const rejectFriendInvite = (accepter, asker, callback) => {
  db.getItem({
    TableName: 'users',
    Key: {
      username: {
        S: asker
      }
    },
  }, (err, data) => {
    if (err) {
      console.log(err);
      callback(500, err, null);
    } else {
      let askerData = data.Item;
      let askerRequests = parseJSONwithS(askerData.sentRequests);
      askerRequests = askerRequests.filter(d => d != accepter);

      db.updateItem({
        TableName: 'users',
        Key: {
          username: {
            S: asker
          }
        },
        UpdateExpression: 'SET sentRequests = :requests',
        ExpressionAttributeValues: {
          ':requests': {S: JSON.stringify(askerRequests)}
        }
      }, (err, data) => {
        if (err) {
          console.log(err);
          callback(500, err, null);
        } else {
          db.deleteItem({
            TableName: "requests",
            Key: {
              "accepter": {S: accepter},
              "asker": {S: asker},
            },
          }, (err, data) => {
            if (err) {
              console.log(err);
              callback(500, err, )
            } else {
              callback(201, err, data);
            }
          });
        }
      });
    }
  });
}

const acceptFriendInvite = (accepter, asker, callback) => {
  db.deleteItem({
    TableName: "requests",
    Key: {
      "accepter": {S: accepter},
      "asker": {S: asker},
    },
  }, (err, data) => {
    if (err) {
      console.log(err);
      callback(500, err, null); 
    } else {
      db.getItem({
        TableName: 'users',
        Key: { 
          username: {S: accepter}
        },
      }, (err, data) => {
        if (err) {
          console.log(err);
          callback(500, err, null);
        } else {
          let accepterData = data.Item;
          db.getItem({
            TableName: 'users',
            Key: {
              username: {S: asker}
            },
          }, (err, data) => {
            let askerData = data.Item;
            if (err) {
              console.log(err);
              callback(500, err, null);
            } else {
              let accepterFriends = parseJSONwithS(accepterData.friends);
              accepterFriends.push(asker);
              db.updateItem({
                TableName: 'users',
                Key: {
                  username: {
                    S: accepter
                  }
                },
                UpdateExpression: 'SET friends = :friends',
                ExpressionAttributeValues: {
                  ':friends': {S: JSON.stringify(accepterFriends)}
                }
              }, (err, data) => {
                if (err) {
                  console.log(err);
                  callback(500, err, null);
                } else {
                  console.log(parseJSONwithS(askerData.friends));
                  let askerFriends = parseJSONwithS(askerData.friends);
                  askerFriends.push(accepter);

                  let askerRequests = parseJSONwithS(askerData.sentRequests);
                  askerRequests = askerRequests.filter(d => d != accepter);

                  db.updateItem({
                    TableName: 'users',
                    Key: {
                      username: {
                        S: asker
                      }
                    },
                    UpdateExpression: 'SET friends = :friends, sentRequests = :requests',
                    ExpressionAttributeValues: {
                      ':friends': {S: JSON.stringify(askerFriends)},
                      ':requests': {S: JSON.stringify(askerRequests)}
                    }
                  }, (err, data) => {
                    if (err) {
                      console.log(err);
                      callback(500, err, null);
                    } else {
                      callback(201, err, data);
                    }
                  });
                }
              });
            }
          });
        }
      });
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

      console.log(rPrev);

      let newSentRequests = rPrev && rPrev.length > 0 
        ? JSON.stringify(JSON.parse(rPrev).append(accepter)) 
        : JSON.stringify([accepter]);
      askerUser.sentRequests = {S: newSentRequests};

      Object.entries(askerUser).forEach(entry => {
        let [key, val] = entry;
        item[key] = val;
      });

      console.log(item);

      db.putItem({
        TableName: 'users',
        Item: item,
      }, (err, data) => {
        if (err) {
          console.log(err);
          callback(500, err, null);
        } else {
          db.putItem({
            TableName: 'requests',
            Item: {
              accepter: {S: accepter},
              asker: {S: asker},
              type: {S: "friend"},
              status: {BOOL: false},
              timestamp: {S: (new Date()).toUTCString()}
            }
          }, (err, data) => {
            if (err) {
              console.log(err);
              callback(500, err, null);
            } else {
              callback(201, err, newSentRequests);
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
/*** 
 * adds chat with given data to table; if chatid is already in existence (rare occurence) generates a new id, tries again.
 * modifies: chatrooms table
 * @params chatdats { roomid: randomly generated uuid, creator: user who sent the request, chatname: user input}, callback
 */
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

/*** 
 * adds corresponding chat info into the user's list of chats in table users
 * modifies: users table, chatrooms attribute
 * @params username, chatid, chatname
 */
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

var displayFriends = function (username, chatid, callback) {
	// display list of friends: req.session.friendslist
	// extract list of friends in user; then extract list of users in chat
	// compare two, send list of friends of user
	console.log("reached query");
	
	var listoffriends = [];
	var listofuserschat = [];
	
	var paramsUsers = {
		ExpressionAttributeValues: {
	      ':username': {S: username},
	    },
	    KeyConditionExpression: 'username = :username',
	    TableName: 'users'
	};
	
	var paramsChatrooms = {
		ExpressionAttributeValues: {
	      ':chatid': {S: chatid},
	    },
	    KeyConditionExpression: 'roomid = :chatid',
	    TableName: 'chatrooms'
	}
	
	db.query(paramsUsers, function (err, data) {
		if (err) {
			console.log(err);
			callback(500, err, null);
		} else {
			if (data.Items[0].friends != null) {
				console.log(data.Items[0].friends);
				
				if (data.Items[0].friends.S != '') {
					listoffriends = JSON.parse(data.Items[0].friends.S);
					
					db.query(paramsChatrooms, function (err, data) {
						if (err) {
							console.log(err);
							callback(500, err, null);
						} else {
							if (data.Items[0].users != null) {
								console.log(data.Items[0].users);
								if (data.Items[0].users.S != '') {
									listofuserschat = JSON.parse(data.Items[0].users.S);
									
									// console.log(compareLists(listoffriends, listofuserschat));
									var listfriends = extractUserNames(compareLists(listoffriends, listofuserschat), callback);
								} else {
									// console.log(compareLists(listoffriends, listofuserschat));
									var listfriends = extractUserNames(compareLists(listoffriends, listofuserschat), callback);
								}
							} else {
								console.log("No users in this chat!");
								
								// console.log(compareLists(listoffriends, listofuserschat));
								var listfriends = extractUserNames(compareLists(listoffriends, listofuserschat), callback);
							}
						}
					});
					
				} else {
					db.query(paramsChatrooms, function (err, data) {
						if (err) {
							console.log(err);
							callback(500, err, null);
						} else {
							if (data.Items[0].users != null) {
								console.log(data.Items[0].users);
								if (data.Items[0].users.S != '') {
									listofuserschat = JSON.parse(data.Items[0].users.S);
									
									// console.log(compareLists(listoffriends, listofuserschat));
									var listfriends = extractUserNames(compareLists(listoffriends, listofuserschat), callback);
								} else {
									// console.log(compareLists(listoffriends, listofuserschat));
									var listfriends = extractUserNames(compareLists(listoffriends, listofuserschat), callback);
								}
							} else {
								console.log("No users in this chat!");
								
								// console.log(compareLists(listoffriends, listofuserschat));
								var listfriends = extractUserNames(compareLists(listoffriends, listofuserschat), callback);
							}
						}
					});
				}
			} else {
				db.query(paramsChatrooms, function (err, data) {
					if (err) {
						console.log(err);
						callback(500, err, null);
					} else {
						if (data.Items[0].users != null) {
							console.log(data.Items[0].users);
							if (data.Items[0].users.S != '') {
								listofuserschat = JSON.parse(data.Items[0].users.S);
								
								// console.log(compareLists(listoffriends, listofuserschat));
								var listfriends = extractUserNames(compareLists(listoffriends, listofuserschat), callback);
							} else {
								// console.log(compareLists(listoffriends, listofuserschat));
								var listfriends = extractUserNames(compareLists(listoffriends, listofuserschat), callback);
							}
						} else {
							console.log("No users in this chat!");
							
							// console.log(compareLists(listoffriends, listofuserschat));
							var listfriends = extractUserNames(compareLists(listoffriends, listofuserschat), callback);
						}
					}
				});
			}
		}
	});
}

/*** 
 * returns array of items in Array A but not B
 * @params input: (Array A, Array B, callback function)
 */
function compareLists (arrayA, arrayB) {
	var ans = [];
	for (let i = 0; i < arrayA.length; i++) {
		let curr = arrayA[i];
		if (!arrayB.includes(curr)) {
			ans.push(curr);
		}
	}
	console.log(ans);
	return ans;
}

/***
 * 
 * @params
 */
 
 function extractUserNames (userlist, callback) {
	var ans = [];
	
	if (userlist == null) {
		userlist = [];
	}
	
	for (let i = 0; i < userlist.length; i++) {
		let username = userlist[i];
		var params = {
			ExpressionAttributeValues: {
				':username': {S: username},
			},
			KeyConditionExpression: 'username = :username',
			TableName: 'users'
		}
		db.query(params, (err, data) => {
			if (err) {
				console.log(err);
				callback(500, err, null);
			} else {
				var userdisplay = '';
				if (data.Items[0].displayname != null && data.Items[0].displayname.S != '') {
					userdisplay = data.Items[0].displayname.S;
				}
				var userfullname = '';
				if (data.Items[0].firstname != null && data.Items[0].lastname != null) {
					userfullname = data.Items[0].firstname.S + " " + data.Items[0].lastname.S;
				}
				
				let userobj = {userid: username, displayname: userdisplay, fullname: userfullname};
				ans.push(userobj);
				
				if (ans.length == userlist.length) {
					callback(200, null, ans);
				}
			}
		});
	}
}

/***
 * @params (friend id, chat id, callback (status, err, data))
 */
const addFriendToChat = (friend, chatid, callback) => {
	// add given friend 
	const gmtTimeStamp = new Date().toUTCString();
	
	var chatinvite = {
		"accepter" : {"S": friend},
		"asker" : {"S": chatid},
		"status" : {"BOOL": false},
		"timestamp" : {"S": gmtTimeStamp},
		"type" : {"S": "chat"}
	}
	
	db.putItem({"TableName": "requests", "Item" : chatinvite}, (err, data) => {
		if (err) {
			callback(500, err, null);
		} else {
			console.log(data);
			callback(200, null, data);
		}
	});
}

/***
 * @params input chatid, (status, err, data)
 * @description gets corresponding info from chatrooms, sends to server data including: past chat messages [] and current users []
 * data format should be { pastmessages: , currentusers: }
 */
const viewOneChat = (chatid, callback) => {
	// return chat info & messages
	var paramsMessages = {
		TableName: 'chatmessages',
		ExpressionAttributeValues: {
				':cid': {S: chatid},
		},
		KeyConditionExpression: 'roomid = :cid',
	}
	
	var paramsUsers = {
		TableName: 'chatrooms',
		Key: {
			'roomid' : {S: chatid}
		}
	}
	
	// get for users first, table chatrooms
	
	db.getItem(paramsUsers, (err, data) => {
		if (err) {
			console.log(err);
			callback(500, err, null);
		} else {
			var currusers = JSON.parse(data.Item.users.S);
			
			db.query(paramsMessages, (err2, data2) => {
				if (err2) {
					console.log(err2);
					callback(500, err2, null);
				} else {
					var messages = data2.Items;
					callback(200, null, { pastmessages: messages, chatmembers: currusers});
				}
			}); 
		}
	});
	
}

const acceptChatInvite = (chatid, userid, callback) => {
	// look up invite in requests table, change status to accepted
	// lookup chat in chatrooms, add user,
	// lookup user, call addChatHelper
	
	var paramsRequest = {
		TableName: 'requests',
		Key: {
			"accepter" : {S: userid},
			"asker" : {S: chatid}
		},
		UpdateExpression: "SET #stat=:e",
		ExpressionAttributeValues:{
			":e": {BOOL: true}
		},
		ExpressionAttributeNames: {
    		"#stat": "status"
  		}
	}
	
	var paramsChat = {
		TableName: 'chatrooms',
		ExpressionAttributeValues: {
				':chatid': {S: chatid},
		},
		KeyConditionExpression: 'roomid = :chatid',
	}
	
	db.updateItem(paramsRequest, (errRequest, dR) => {
		if (errRequest) {
			callback(500, errRequest, null);
		} else {
			db.query(paramsChat, (errChatrooms, dC) => {
				if (errChatrooms) {
					callback(500, errChatrooms, null);
				} else {
					if (dC.Count == 0 || dC.Items[0].users.S == '') {
						callback(400, null, null);
					} else {
						let currentusers = [];
						console.log("Reached chatrooms update")
						currentusers = currentusers.concat(JSON.parse(dC.Items[0].users.S));
						console.log(currentusers);
						currentusers.push(userid);
						console.log(currentusers)
						
						let chatname = dC.Items[0].chatname.S;
						
						var paramsChatUpdate = {
							TableName: 'chatrooms',
							Key: {
								'roomid' : {S: chatid}
							},
							UpdateExpression: "SET #users=:u",
							ExpressionAttributeValues:{
								":u": {S : JSON.stringify(currentusers)}
							},
							ExpressionAttributeNames:{
								"#users" : 'users',
							}
						}
						db.updateItem(paramsChatUpdate, (errCU, dCU) => {
							if (errCU) {
								callback(500, errCU, null);
							} else {
								addChatHelper(userid, chatid, chatname);
								callback(200, null, dCU);
							}
						})
					}
				}
			})
		}
	});
}

const declineChatInvite = (chatid, userid, callback) => {
	// look up invite in requests table, delete item
	var paramsRequest = {
		TableName: 'requests',
		Key: {
			"accepter" : {S: userid},
			"asker" : {S: chatid}
		},
	}
	
	db.deleteItem(paramsRequest, (err, data) => {
		if (err) {
			callback(500, err, null);
		} else {
			callback(200, err, data);
		}
	});
}

const saveMessage = (messageobj, callback) => {
	var messageitem = {
		'roomid' : {S: messageobj.room},
		'messageid' : {S:messageobj.messageid},
		'text' : {S:messageobj.text},
		'sender' : {S:messageobj.sender},
		'timestamp' : {S:messageobj.timestamp},
	}
	
	db.putItem({TableName: 'chatmessages', Item: messageitem}, (err, data) => {
		if (err) {
			callback(500, err, null);
		} else {
			console.log("Save message success!");
			callback(200, null, data);
		}
	});
}

const extractOneUserDisplayInfo = (username, callback) => {
	let uli = [username];
	extractUserNames(uli, callback);
}

// end of ACE HOUR



const database = {
  // queryUser: queryUser,
  createUser: createUser,
  editUser: editUser,
  loginUser: loginUser,
  scanUsers: scanUsers,

  scanNewsCategories: scanNewsCategories,
  
  sendFriendRequest: sendFriendRequest,
  getFriends: getFriends,
  queryRequests: queryRequests,
  // queryFriendInvites: queryFriendInvites,
  acceptFriendInvite: acceptFriendInvite,
  rejectFriendInvite: rejectFriendInvite,

  queryPosts: queryPosts,
  
  // ACE
  findChats: findChats,
  newChat: addChatToTable,
  getFriendsList: displayFriends,
  addFriendToChat: addFriendToChat,
  viewChat: viewOneChat, 
  saveMessage: saveMessage,
  extractOneUserDisplayInfo: extractOneUserDisplayInfo,
  
  acceptChatInvite: acceptChatInvite,
  declineChatInvite: declineChatInvite,
  
  // ACE
  
  
}

module.exports = database;
