const { sendStatus } = require('express/lib/response');
const usr = require('../models/user');
const db = require('../models/database');

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

const postCreateUser = (req, res) => {
  let user = req.body.user;

  if (user && usr.checkUser(user)) {
    db.createUser(user, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
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
	if (req.session.user != null) {
		let user = req.session.user;
		// call db method to query
		db.findChats(user, (err, data) => {
			// create js array using data, save array to session: req.session.chats
			if (err) {
				console.log(err);
			} else {
				req.session.chats = data;
			}
		});
		// render chats page: if req.session.chats == null or empty list, show a specific message on the page (FRONTEND)
		res.render('chats');
	} else {
		// not logged in, return to homepage & log reason on console
		console.log("Not logged in, returned to homepage.");
		res.render('splash');
	}
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
	
	// KEVIN: on frontend, check session.currentroom to display chatbox, 
	// also we need functionality so that on click of a chatroom listed it sends openChat request with req.body.chattoopen variable plz 
	// PS: we need to refresh chatbox every 1 second
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
  function: removes current user from chatroom
  if error: send error message to session, console error
 */
const leaveChat = (req, res) => {
	
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

const routes = {
  getSplash: getSplash,
  getLogin: getLogin,
  getSignUp: getSignUp,
  getWall: getWall,
  
  // ace: To Commit
  getChat: getChat,
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

  postCreateUser: postCreateUser
}

module.exports = routes;