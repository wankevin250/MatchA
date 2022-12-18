const { sendStatus } = require('express/lib/response');
const usr = require('../models/user');
const db = require('../models/newsdatabase');
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

    db.runSpark (user, (err, data) => {
      if (err) {
        console.log(err);
      }
    })

    db.computeRank(user, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log("Made it to else statement! at computeRank");
       // console.log(data);
       // console.log("0's headline:" + data[0].headline.S);
        data = data.slice(0,5);

        for (let i = 0; i < data.length; i++) {
          result = data[i].headline.S;
          results.push(result);
        }

        db.fetchNewsDataByName(results, (err, data) => {
          if (err) {
            console.log(err);
          } else {
            /*data.forEach(function(element, index, array) {
              console.log("Element"+element.headline.S);
              newsdata.push(element)});*/
              //console.log("newsdata"+element);
              for (let i = 0; i < data.length; i++) {
                console.log(data[i].headline.S);
              }
              res.render('news.pug', {results: data});
              //res.send(data);

              db.addViewHistory(user, results, (err,data) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log("successfully" + data);
                }
              })
          }
        })
      }
    })
  } else {
    console.log("Not logged in, returned to homepage.");
		res.redirect('/');
  }
}

const addLike = (req, res) => {
  let news = req.body.headline; // should input the string
  //let news = "Christian Nationalism On The Rise In Some GOP Campaigns";
  let user = req.session.user;

  db.likeNews(user, news, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      res.send({mess:"success"});
    }
  })
}

const searchNews = (req, res) => {
  let user = req.session.user;
  //word = request.query.keyword;
  word = "college education";
  arr = word.split(" ");
  console.log(arr);
  newsdata = [];

  db.findNews(user, arr, (err, noRanks, ranks) => {
    if (err) {
      if (err != "empty") {
        console.log(err);
      } else {
        res.send("no matched result");
      }
    } else {
      console.log(ranks);
      console.log(noRanks);
      db.fetchTitleByRank(user, ranks, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          console.log(data)
          results = [];
          for (let i = 0; i < data.length; i++) {
            let result = data[i].headline.S;
            results.push(result);
          }

          for (let i = 0; i < noRanks.length; i++) {
            results.push(noRanks[i]);
          }

          db.fetchNewsDataByName(results, (err, data) => {
            if (err) {
              console.log(err);
            } else {
              data.forEach(function(element, index, array) {
                //console.log(element);
                newsdata.push(element)});
                //res.render('news.pug', {results: newsdata});
                res.send(JSON.stringify(newsdata));
            }
          })
        }
      })
    }
  })
}

const routes = {
    //Sebin's new
  calculateRank: calculateRank,
  searchNews: searchNews,
  addLike: addLike,
}

module.exports = routes;