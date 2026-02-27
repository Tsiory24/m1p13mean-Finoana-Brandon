const express = require('express');
const cors = require('cors');

require('dotenv').config();

const app = express();

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - autorise Angular dev server (et toute autre origine)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-IP'],
  optionsSuccessStatus: 200
}));

module.exports = app;
