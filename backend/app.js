const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// CORS - autorise Angular dev server (et toute autre origine)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-IP'],
  optionsSuccessStatus: 200
}));

module.exports = app;
