const { sendStatus } = require('express/lib/response');
const usr = require('../models/user');
const db = require('../models/database');
const user = require('../models/user');
const e = require('express');


// Sebin routes for news
const calculateRank = (req, res) => {
	result = []
  results = []
  newsdata = []
	// execute the java command
  if (req.session.user != null) {
		let user = req.session.user;
    console.log(user);

    db.computeRank(user, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log("Made it to else statement! at computeRank");
        console.log(data);
        console.log("0's headline:" + data[0].headline.S);

        for (let i = 0; i < data.length; i++) {
          result = data[i].headline.S;
          results.push(result);
        }

        db.fetchNewsData(results, (err, data) => {
          if (err) {
            console.log(err);
          } else {
            data.forEach(function(element, index, array) {
              console.log(element);
              newsdata.push(element)});
              //res.render('news.pug', {results: newsdata});
              res.send(JSON.stringify(newsdata));
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