const express = require('express');
const logger = require('./middleware/logger');

const app = express();

require('./startup/logging')();
require('./startup/db')();
require('./startup/config')();
require('./startup/routes')(app);
require('./startup/prod')(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Listening to the port ${PORT}`);
});
