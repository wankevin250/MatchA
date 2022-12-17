const { sendStatus } = require('express/lib/response');
const usr = require('../models/user');
const db = require('../models/database');
const user = require('../models/user');
const e = require('express');

/**
 * Checks if HTTP Status code is successful (between 200-299)
 * @param {int} status 
 * @returns true if status is successful http code
 */
const isSuccessfulStatus = (status) => {
  return status < 300 && status >=200;
}

const getSplash = (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/wall');
  } else {
    res.render('splash');
  }
}

const getSignUp = (req, res) => {
  res.render('signup');
}

const getLogin = (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/wall');
  } else {
    res.render('login');
  }
}

const getWall = (req, res) => {
  if (req.session && req.session.user) {
    res.render('wall');
  } else {
    res.redirect('/login');
  }
}

const getSearchUser = (req, res) => {
  if (req.session && req.session.user) {
    console.log(req.query);
    if (req.query.term) {
      res.render('search', {query: req.query.term});
    } else {
      res.redirect('/error');
    }
  } else {
    res.redirect('/login');
  }
}

const getFriends = (req, res) => {
  if (req.session && req.session.user) {
    res.render('friends');
  } else {
    res.redirect('/login');
  }
}

const getSettings = (req, res) => {
  if (req.session && req.session.user) {
    let user = req.session.user;
    console.log(user);
    res.render('settings', {user: user});
  } else {
    res.redirect('/login');
  }
}

const getMyWall = (req, res) => {
  let homeUser = req.params.username;

  if (req.session && req.session.username) {
    res.render('mywall', {homeuser: homeUser});
  } else {
    res.redirect('/login');
  }
}

const postScanUsers = (req, res) => {
  let query = req.body.query;
  console.log(query);

  if (query && query.length > 2) {
    db.scanUsers(query, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        res.send(JSON.stringify(data));
      } else {
        res.status(500).send(new Error(err));
      }
    });
  } else {
    res.status(400).send(new Error("No Query"));
  }
}

const postGetFriend = (req, res) => {
  let username = req.session.user.username;
  
  if (username && username.match(/^\w{3,25}$/)) {
    db.getFriends(username, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        let cleanData = data.map(d => {
          return d.accepter.S == username ? d.asker.S : d.accepter.S
        });
        res.send(JSON.stringify(cleanData));
      } else {
        res.status(status).send(new Error(err));
      }
    });
  }
}

const postAddFriend = (req, res) => {
  let accepter = req.body.accepter;
  console.log(accepter);

  if (accepter && accepter.match(/^\w{3,25}$/)) {
    db.addFriend(req.session.user.username, accepter, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        res.sendStatus(201);
      } else {
        res.status(status).send(new Error(err));
      }
    });
  } else {
    res.status(401).send(new Error("Unsupported username"));
  }
}

const postMyWallRefresh = (req, res) => {
  let userwall = req.body.userwall;

  if (req.session && req.session.user) {
    db.queryPosts(userwall, (status, err, data) => {
      if (isSuccessfulStatus(status)) {

      } else {
        res.status(status).send(new Error(err));
      }
    });
  } else {
    res.status(401).send(new Error("No user signed in"));
  }
}

const postWallRefresh = (req, res) => {
  if (req.session && req.session.user) {
  } else {
    res.status(401).send(new Error("No user signed in"));
  }
}

const postLoginUser = (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  if (req.session && req.session.user) {
    res.status(403).send(new Error("User already signed in"));
  } else {
    db.loginUser(username, password, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        let user = data.Items[0];
        Object.entries(data.Items[0]).forEach(d => {
          let [key, val] = d;
          user[key] = val.S;
        });
        req.session.user = user;
        res.redirect('/wall');
      } else {
        res.status(status).send(new Error(err));
      }
    }); 
  }
}

const postEditUser = (req, res) => {
  if (req.session.user && req.body.user) {
    let newUserInfo = req.body.user;
    let currUser = structuredClone(req.session.user);

    Object.entries(newUserInfo).forEach(entry => {
      let [key, val] = entry;
      currUser[key] = val;
    });
    
    db.editUser(currUser, 
      newUserInfo.username, 
      newUserInfo.email, 
      (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        req.session.user = currUser;
        res.sendStatus(201);
      } else {
        res.status(status).send(new Error(err));
      }
    });
    
  } else {
    res.status(401).send(new Error("Invalid user input"));
  }
}

const postCreateUser = (req, res) => {
  let user = req.body.user;

  if (user && usr.checkUser(user)) {
    db.createUser(user, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        req.session.user = user;
        res.sendStatus(201);
      } else {
        res.status(status).send(new Error(err));
      }
    });
  } else {
    res.status(401).send(new Error('Invalid user input'));
  }
}

// ace: routes
/**
  input: req, res
  function: calls on database method to create new chatroom with a friend
 */
const getChat = (req, res) => {
	// call user from req.session.user
	let user = req.session.user;
	
	if (req.session.user != null) {
		res.render('chats');
	} else {
		// not logged in, return to homepage & log reason on console
		res.redirect('/');
	}
}

/**
var sendChatList = function (req, res) {
	// call user from req.session.user
	let user = req.session.user;
	
	db.findChats(user, (err, data) => {
		if (err != null) {
			console.log(err);
		} else {
			return res.json({clist: JSON.parse(data)}); //{currentuser: user.username, clist: data}));
		}
	});
} */

const sendChatList = (req, res) => {
  let username = req.session.user.username;
  db.findChats(username, (err, data) => {
	if(data != null) {
		console.log(data);
		var obj = {'clist' : JSON.parse(data), 'username': username};
		res.send(obj);
	} else {
		console.log(err);
	}
  });
}

/**
  input: req, res
  function: adds new chat to database, opens up in chatbox
  if error: send error message to session, console error
 */
const addChat = (req, res) => {
	// if user is logged in, continue
	// generate a new chatroom item (using db), save to req.session.currentroom
	// also send data to frontend
	if (req.session.user != null) {
		let user = req.session.user;
		// call newChat function
		db.newChat(user, (chatinfo, err, data) => {
			// return chatinfo = {room-uuid: value, chatname: chat name}
			if (err) {
				console.log(err);
			} else {
				// set req.session.currentroom = { id: room-uuid, name: chatname, creator: req.session.user }
			}
		});
		// KEVIN: on frontend we need to call reloadData on the chatlist div after addChat 
		
	} else {
		// not logged in, return to homepage & log reason on console
		console.log("Not logged in, returned to homepage.");
		res.render('splash');
	}
}

/**
	function: pops up list of friends that (on frontend) you can click on to add a user's friend to the chat
	if error: console error
 */
const viewFriends = (req, res) => {
	// if user exists
	
	// display list of friends: req.session.friendslist
	// to KEVIN: on frontend, if req.session.friendslist != null then display a popup / container
}

/**
  input: req, res
  function: sends chat invite to friend
  if error: send error message to session, console error
 */
const addFriend = (req, res) => {
	// if user exists
	
	// on click, send request to add friend to db using addFriendToChat
	
	// set req.session.friendslist == null
	// to KEVIN: on frontend, is there a way to close the friendslist popup?
	
}

/**
  input: req, res
  function: calls on method to open up chatroom
  if error: 
 */
const openChat = (req, res) => {
	// upon clicking one of chats in list, open chatbox in side of screen
	// set req.session.currentroom = { id: room-uuid, name: chatname, creator: creator}
	
	const room = req.body.room;
	req.session.currentroom = room;
	console.log(req.body.room);
	
	// KEVIN: on frontend, check session.currentroom to display chatbox, 
	// also we need functionality so that on click of a chatroom listed it sends openChat request with req.body.chattoopen variable plz 
	// PS: we need to refresh chatbox every 1 second
	
	// return res.send true?
	/* if success: return res.send({
		success: true
	});
	*/
	
	res.send({
		success: true
	});
}

/**
  input: req, res
  function: removes current user from chatroom
  if error: send error message to session, console error
 */
const leaveChat = (req, res) => {
	// return res.send true?
	req.session.currentroom = null;
	/* if success: return res.send({
		success: true
	});
	*/
	
	res.send({
		success: true
	});
}

/**
  input: req, res
  function: sends message to current chatroom
  if error: 
 */
const sendMsg = (req, res) => {
	
}

const reloadMsgs = (req, res) => {
	// res.json list of messages every 10 seconds
}

const reloadChats = (req, res) => {
	// res.json list of user's active chats
	// reload chats when we add a chat OR when accept chat invite
}

/**
  input: req, res
  function: SHOULD ONLY BE POSSIBLE IF CREATOR, removes specific user from chatroom
  if error: send error message to session, console error
 */
const removeUser = (req, res) => {
	
}

const viewUsers = (req, res) => {
	
}

// end of Ace

// Kevin visualizer routes
const getVisualizer = (req, res) => {
  res.render('visualizer.pug')
}

const sendFriends = (req, res) => {
  console.log("Made it to sendFriends!");
  if (req.session.user != null) {
		let user = req.session.user;
    console.log(user);

    db.getFriends(user.username, (statuscode, err, data2) => {
      if (err) {
        console.log("Status code: " + statuscode);
        console.log(err);
      } else {
        console.log("Made it to else statement!");
        console.log(data2);
        res.send(JSON.stringify(data2));
      }
    })
  } else {
    console.log("Not logged in, returned to homepage.");
		res.redirect('splash.pug');
  }
}

// Sebin routes for news
const calculateRank = (req, res) => {
	result = []
  results = []
	// execute the java command
  if (req.session.user != null) {
		let user = req.session.user;
    console.log(user);

    db.computeRank(user, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log("Made it to else statement!");
        console.log(data);
        for (let i = 0; i < data.length; i++) {
          result = data[i].Items[0];
          results.push(result);
        }

        db.fetchNewsData(results, (err, data) => {
          if (err) {
            console.log(err);
          } else {
            console.log(data);
            res.send(JSON.stringify(data));
          }
        })
      }
    })
  } else {
    console.log("Not logged in, returned to homepage.");
<<<<<<< HEAD
		res.redirect('/');
=======
		res.redirect('/login');
>>>>>>> b7bce3e8a6987e2643b42b3c2ce0c4c385bd1193
  }
}

const searchNews = (req, res) => {
  word = request.query.keyword;
  arr = word.split(" ");

  db.findNews(arr, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
      //res.send()
    }
  })
}

const routes = {
  getSplash: getSplash,

  // Login, account creation
  getLogin: getLogin,
  getSignUp: getSignUp,
  getWall: getWall,
  getSearchUser: getSearchUser,
  getFriends: getFriends,
  getSettings: getSettings,
  getMyWall: getMyWall,
  
  // ace: To Commit
  loadChatPage: getChat,
  postChatList: sendChatList,
  addChat: addChat,
  popupFriends: viewFriends,
  addFriend: addFriend,
  openChat: openChat,
  sendMessage: sendMsg,
  leaveChat: leaveChat,
  removeUser: removeUser,
  viewUsers: viewUsers,
  
  reloadRoom: reloadMsgs,
  reloadChats: reloadChats,
  // end of ace's routes

  postCreateUser: postCreateUser,
  postEditUser: postEditUser,
  postLoginUser: postLoginUser,
  postWallRefresh: postWallRefresh,
  postScanUsers: postScanUsers,

  postAddFriend: postAddFriend,
  postGetFriend: postGetFriend,

  // Kevin's visualizer routes
  getVisualizer: getVisualizer,
  sendFriends: sendFriends,

  //Sebin's new
  calculateRank: calculateRank,
  searchNews: searchNews,
}

module.exports = routes;