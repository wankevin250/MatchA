var db = require('../models/database');

const getSplash = (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/wall');
  } else {
    res.render('splash');
  }
}

const getLogin = (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/wall');
  } else {
    res.render('login');
  }
}

const routes = {
  getSplash: getSplash,
  getLogin: getLogin,
}

module.exports = routes;