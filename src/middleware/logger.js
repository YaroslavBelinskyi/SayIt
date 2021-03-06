// need to delete this or use instead of express-async-errors module.
/* module.exports = function (handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res);
        } catch (ex) {
            next(ex);
        }
    };
};
*/
const winston = require('winston');
const config = require('config');

require('winston-mongodb');

const db = config.get('db');

module.exports = winston.createLogger({
    level: 0,
    transports: [
        new winston.transports.Console({ colorize: true, prettyPrint: true }),
        new winston.transports.File({ filename: 'logfile.log' }),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'exceptions.log' }),
        new winston.transports.MongoDB({ db }),
    ],
});

// added for logging errors into BD.
winston.add(new winston.transports.MongoDB({ db }));
