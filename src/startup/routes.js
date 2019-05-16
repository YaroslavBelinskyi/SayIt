const express = require('express');
const cors = require('cors');
const error = require('../middleware/error');
const api = require('./api');

module.exports = function (app) {
    app.use(cors());
    app.use(express.json());
    app.use('/api', api);
    app.use(error);
};
