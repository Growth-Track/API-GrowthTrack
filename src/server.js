const router = require("./routes.js");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;


// Middleware to parse JSON bodies
app.use(bodyParser.json());


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json({ limit: '10mb' }));
app.use(router);
app.use(fileUpload());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
