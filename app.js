const express = require('express');

const app = express();
const PORT = 8080; // port

const routes = require('./routes/routes.js');

app.use(express.urlencoded()); // express will parse queries from the URL
app.use(express.static('static')); // express serves static resources from static folder
app.set('view engine', 'pug'); // set the rendering engine to pug

app.get('/', routes.getHome);

app.listen(PORT, () => console.log(`Example app is listening on port ${PORT}`));