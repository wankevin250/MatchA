const { sendStatus } = require('express/lib/response');
var db = require('../models/database');

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

  if (user && user.checkUser(user)) {
    db.createUser(user, (status, err, data) => {
      res.sendStatus(status);
    });
  } else {
    res.sendStatus(401);
  }
}

const routes = {
  getSplash: getSplash,
  getLogin: getLogin,
  getSignUp, getSignUp,

  postCreateUser: postCreateUser
}

module.exports = routes;