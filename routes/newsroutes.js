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
        data = data.slice(0,8);

        for (let i = 0; i < data.length; i++) {
          result = data[i].headline.S;
          results.push(result);
        }

        db.fetchNewsDataByName(results, (err, data) => {
          if (err) {
            console.log(err);
          } else {
              for (let i = 0; i < data.length; i++) {
                if (data[i].authors.S.length == 0) {
                  data[i].authors.S = "Cannot find";
                }
                if (data[i].short_description.S.length == 0) {
                  data[i].short_description.S = "Cannot find";
                } 
                if (data[i].short_description.S.length > 0) {
                  data[i].short_description.S = data[i].short_description.S.replace(/([[\]\\])/g , "");
                }
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
  //let news = req.body.headline; // should input the string
  //console.log(news);
  let news = "Christian Nationalism On The Rise In Some GOP Campaigns";
  console.log(news);
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
  word = req.query.keyword;
  arr = word.split(" ");
  newsdata = [];

  db.findNews(user, arr, (err, multiple, noRanks, ranks) => {
    if (err) {
      if (err != "empty") {
        console.log(err);
      } else {
        res.send("no matched result");
      }
    } else {
      results = [];
      console.log(multiple);
      for (let i = 0; i < multiple.length; i++) {
        let result = multiple[i];
        results.push(result);
      }
      //console.log(ranks);
      //console.log(noRanks);
      db.fetchTitleByRank(user, ranks, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          console.log(data)
          
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
                res.render('newsresult.pug', {results: newsdata});
                //res.send(JSON.stringify(newsdata));
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