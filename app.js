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
app.get('/signup', routes.getSignUp);
app.get('/login', routes.getLogin);
// app.get('/wall', null);
// app.get('/profile', null);
// app.get('/settings', null);
// app.get('/friends', null);
// app.get('/visualizer', null);
app.get('/chat', routes.getChat);
app.get('/sendmessage', routes.sendMessage);
// app.get('/news', null);

//AJAX Post
app.post('/ajaxpostsignup', routes.postCreateUser);
// app.post('/ajaxpostlogin', null);
// app.post('/ajaxgetwall', null);

app.listen(PORT, () => console.log(`Example app is listening on port ${PORT}`));
