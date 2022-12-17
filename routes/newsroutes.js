const { sendStatus } = require('express/lib/response');
const usr = require('../models/user');
const db = require('../models/database');
const user = require('../models/user');
const e = require('express');


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
          result = data[i].Items;
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
		res.redirect('/');
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
    //Sebin's new
  calculateRank: calculateRank,
  searchNews: searchNews,
}

module.exports = routes;