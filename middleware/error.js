const winston = require('winston');
require('winston-mongodb');

const logger = winston.createLogger({
    level: 0,
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logfile.log' }),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'exceptions.log' }),
        new winston.transports.MongoDB({ db: 'mongodb://localhost/SayIt' }),
    ],
});
// added for logging errors into BD.
winston.add(new winston.transports.MongoDB({ db: 'mongodb://localhost/SayIt' }));

// eslint-disable-next-line no-unused-vars
module.exports = function (err, req, res, next) {
    winston.error(err.message, err);
    logger.log(err.message, err);
    res.status(500).send('Unbelievable, but something failed!');
};
