const express = require('express');
const session = require('express-session');

const app = express();
const PORT = 8080; // port

const routes = require('./routes/routes.js');

app.use(express.urlencoded()); // express will parse queries from the URL
app.use(express.static('static')); // express serves static resources from static folder
app.set('view engine', 'pug'); // set the rendering engine to pug
app.use(session({
  secret: 'nets2120projectgroup11',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 12 // 12 hours
  }
}));

/**
 * route = URL that will redirect to other URLs
 * get = URL that will respond with a rendered page
 * post = URL that will post data to database
 * json = URL that will respond with JSON data
 */
app.get('/', routes.getSplash);
app.get('/login', routes.getLogin);

app.listen(PORT, () => console.log(`Example app is listening on port ${PORT}`));