var db = require('../models/database');

const getHome = (_, res) => {
  res.render('splash');
}

const routes = {
  getHome: getHome,
}

module.exports = routes;