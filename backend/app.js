const express = require('express');
const cors = require('cors');
// const router = require('./user.controller');

require('dotenv').config();

const app = express();

app.use(express.json());

app.use(cors({
    origin: "*"
}));

// app.use(router);

module.exports = app;