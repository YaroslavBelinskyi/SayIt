require('express-async-errors');
const express = require('express');
const config = require('config');
const mongoose = require('mongoose');
const cors = require('cors');
const error = require('./middleware/error');
const users = require('./routes/users');
const auth = require('./routes/auth');
const tweets = require('./routes/tweets');
const tweetLikes = require('./routes/tweetlikes');
const tweetComments = require('./routes/tweetcomments');

const app = express();

require('./startup/prod')(app);

const PORT = process.env.PORT || 3000;

process.on('unhandledRejection', (ex) => {
    throw ex;
});

if (!config.get('jwtPrivateKey')) {
    console.error('FATAL ERROR: jwtPrivateKey is not defined.');
    process.exit(1);
}

const db = config.get('db');
mongoose.connect(db)
    .then(() => console.log('Connected to MongoDB...'))
    .catch(() => console.log('Could not connect to MongoDB...'));

app.use(cors({
    allowedHeaders: ['sessionId', 'Content-Type'],
    exposedHeaders: ['sessionId'],
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
}));
app.use(express.json());
app.use('/api/users', users);
app.use('/api/auth', auth);
app.use('/api/tweets', tweets);
app.use('/api/tweetlikes', tweetLikes);
app.use('/api/tweetcomments', tweetComments);
app.use(error);

app.listen(PORT, () => console.log(`Listening to the port ${PORT}`));
