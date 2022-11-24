const express = require('express');

const app = express();
const PORT = 8080;

app.get('/', (_, res) => {
  res.send('Express is working!');
});

app.listen(PORT, () => console.log(`Example app is listening on port ${PORT}`));