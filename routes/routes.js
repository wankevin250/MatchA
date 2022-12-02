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

const postCreateUser = (req, res) => {
  let user = req.body.user;

  if (user && usr.checkUser(user)) {
    db.createUser(user, (status, err, data) => {
      if (status < 300 && status >= 200) {
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
		// render chats page
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
	
}

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
	// set req.session.currentroom
	
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
  
  // ace: To Commit
  getChat: getChat,
  addChat: addChat,
  addFriend: addFriend,
  openChat: openChat,
  sendMessage: sendMsg,
  leaveChat: leaveChat,
  removeUser: removeUser,
  viewUsers: viewUsers,
  // end of ace's routes

  postCreateUser: postCreateUser
}

module.exports = routes;