const AWS = require('aws-sdk');
const req = require('express/lib/request.js');
const usr = require('./user.js');
const {v4 : uuidv4} = require('uuid');
const stemmer = require("stemmer");

AWS.config.update({
  region: 'us-east-1',
});

const db = new AWS.DynamoDB();


const runSpark = (user, callback) => {
    // using username as an input for run, execute the whole rankJob.class
	var exec = require('child_process').exec;
    var cmnd = 'mvn exec:java@ranker' + ' -Dexec.args=' + user.username;
    
    exec(cmnd,  { encoding: 'utf-8' },
      function (error, stdout, stderr) {
          console.log('stdout: ' + "adsorption complete");
          console.log('stderr: ' + stderr);
          if (error) {
             // console.log('exec error: ' + error);
              callback(error, null);
          } else {
            callback(null, "success");
          }
      });

}

// start of Sebin News
const computeRank = (user, callback) => {
    db.query({
      ExpressionAttributeValues: {
        ':username': {S: user.username},
        ':maxrank': {N: '5'}
      },
      ExpressionAttributeNames: {
        '#rank' : 'rank'
      },
      KeyConditionExpression: 'username = :username and #rank <= :maxrank',
      TableName: 'newsRanked'
    }, (err, data) => {
      if (err) {
        callback(err, null);
      } else {
        if (data.Items.length > 0) {
          //console.log(data);
          callback(null, data.Items);
        } else {     
          //console.log( data.Items);   
          callback(null, data.Items);  
        }
      }
    });
}

const fetchNewsDataByName = (headlines, callback) => {
  var result = [];
  var results = [];
  var promises = [];
  
  for (let i = 0; i < headlines.length; i++) {
    console.log(headlines[i]);
   var params = {
    ExpressionAttributeValues: {
      ':headline': {S: headlines[i]},
    },
    KeyConditionExpression: 'headline = :headline',
    TableName: 'newsData'
  };
   
    let prom = db.query(params).promise(); // making array of promises
    promises.push(prom);
 }
  
  Promise.all(promises).then (
   data => {
     for (let i = 0; i < data.length; i++) {
       //console.log(data);
       if (data[i].length != 0) {
        result = data[i].Items; // or Items[0]?
        console.log(result);
        results.push(result);
       }
     }
     //console.log(results);
     callback(null, results);
   },
   err => {
    callback(err, null);
   } 
 )
}

const addViewHistory = (user, articles, callback) => {
    let displayed = "";
    console.log(articles);
    for (let i = 0; i < articles.length; i++) {
      displayed = displayed.concat(articles[i]);
      displayed = displayed.concat("*");
    }
    // let displayed = articles;
    console.log(displayed);
    
    db.query({
      ExpressionAttributeValues: {
        ':username': {S: user.username},
      },
      KeyConditionExpression: 'username = :username',
      TableName: 'newsViewed',
    }, (err, data) => {
      console.log(data);
      if (err) {
        callback(err, null);
      } else if (data.Items.length > 0) {
        console.log(data.Items[0].viewed.S);
        let prev = data.Items[0].viewed.S;
        params = {
          TableName: 'newsViewed',
                  Key: {
                      username: {
                          'S': user.username
                      }
                  },
                  UpdateExpression: "SET viewed = :viewed",
                  ExpressionAttributeValues: {
            ":viewed": {S: prev.concat(displayed)},
          },
          ReturnValues: "UPDATED_NEW",
        };
        
        db.updateItem(params, function(err, data) {
          if (err) {
            console.log(err)
            callback(err, null);
          } else {
            callback(null, "updated"); // success!
          }
        });
      } else {
        db.putItem({
          TableName: 'newsViewed',
          Item: {
            username: {S: user.username},
            viewed : {S: displayed}
          }
        },(err, data) => {
          if (err) {
            callback(err, null);
          } else {
            callback(null, "first");
          }
          });
      }
    });
}

const likeNews = (user, news, callback) => {
  db.putItem({
    TableName: 'likeNews',
    Item: {
      username: {S: user.username},
      headline : {S: news} 
    }
  },(err, data) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, "success");
    }
    });
}


const findNews = (keyword, callback) => {
  //var docClient = new AWS.DynamoDB.DocumentClient();
  var headlines =[];
  var promises = [];

  for (let i = 0; i < arr.length; i++) {
    searchWord = keyword[i];
    console.log(searchWord);
    searchWord = searchWord.toLowerCase(); // change the search word into lowercase letter
      if (!(searchWord == ("a") || searchWord == ("all") || searchWord == ("any") || searchWord == ("but") || searchWord == ("the"))) { //filter the words
          searchWord = stemmer(searchWord); //stem the word
        var params = {
        TableName : "tokenizedNews",
        ExpressionAttributeValues: {
            ':k': {S: searchWord},
          },
        KeyConditionExpression : 'keyword = :k',
        };
        
        let prom = db.query(params).promise(); //create promise for each talk id
        promises.push(prom);
      }
    } 

    Promise.all(promises).then(
      data => {
        console.log(data[0].Items);
        if (data.length < 1) {
            callback("empty", null);
        }
        const today = new Date();
        for (let i = 0; i < data.length; i++) {
              data[i].Items.forEach(function(item){
                const newsDate = new Date(item.date);
                console.log(item)
                if (!headlines.includes(item.headline.S) && newsDate <= today) { // add until it reaches 20 talks
                  headlines.push(item.headline.S);
                }
              });
        }
          console.log("findNews: "+headlines);

          results = [];
          noRanks = [];
          promises = [];

          for (let i = 0; i < headlines.length; i++) { // 여기 꼬임..
            //console.log(headlines[i]);
           var params = {
            ExpressionAttributeValues: {
              ':headline': {S: headlines[i]},
            },
            KeyConditionExpression: 'headline = :headline',
            IndexName : "headline-index",
            TableName: 'newsRanked'
          };
           
            db.query(params, (err, data) => {
                if (err) {
                    callback(err, null, null);
                }
                else if (data.Items.length != 0) {
                    let result = data.Items[0].rank.N; // or Items?
                    console.log(result);
                    results.push(result);
                } else {
                    let result = headlines[i];
                    noRanks.push(result);
                }
            })
        }

        results.sort((function(a,b){ return a - b})).slice(0,10);

        callback(null, noRanks, results)
      }, 
      err => {
        callback(err, null);
        // console.log("error" , err);
      }
      );

}

const fetchTitleByRank = (user, ranks, callback) => {
  var result = [];
  var results = [];
  var promises = [];
  
  for (let i = 0; i < ranks.length; i++) {
    console.log(ranks[i]);
   var params = {
    ExpressionAttributeValues: {
      ':username': {S: user.username},
      ':rank': {N: ranks[i]},
    },
    ExpressionAttributeNames: {
      '#rank' : 'rank'
    },
    KeyConditionExpression: 'username = :username and #rank = :rank',
    TableName: 'newsRanked'
  };
   
    let prom = db.query(params).promise(); // making array of promises
    promises.push(prom);
 }
  
  Promise.all(promises).then (
   data => {
     for (let i = 0; i < data.length; i++) {
       //console.log(data);
       if (data[i].length != 0) {
        result = data[i].Items; // or Items[0]?
        console.log(result);
        results.push(result);
       }
     }
     //console.log(results);
     callback(null, results);
   },
   err => {
    callback(err, null);
   } 
 )
}

const database = {
    runSpark: runSpark,
    computeRank:  computeRank,
    fetchNewsDataByName: fetchNewsDataByName,
    addViewHistory: addViewHistory,
    likeNews: likeNews,
    findNews: findNews,
    fetchTitleByRank: fetchTitleByRank,
    
  }

  module.exports = database;