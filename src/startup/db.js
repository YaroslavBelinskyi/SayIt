const mongoose = require('mongoose');
const config = require('config');
const logger = require('../middleware/logger');

const db = config.get('db');

module.exports = function () {
    mongoose.connect(db, { useNewUrlParser: true, useCreateIndex: true })
        .then(() => logger.info('Connected to MongoDB...'));
};
