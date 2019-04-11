const winston = require('winston');
const logger = require('../middleware/logger');

// eslint-disable-next-line no-unused-vars
module.exports = function (err, req, res, next) {
    winston.error(err.message, err);
    logger.log(err.message, err);
    res.status(500).send('Unbelievable, but something failed!');
};
