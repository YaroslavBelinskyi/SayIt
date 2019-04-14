const express = require('express');
const cors = require('cors');
const error = require('../middleware/error');
const users = require('../routes/users');
const auth = require('../routes/auth');
const tweets = require('../routes/tweets');
const tweetLikes = require('../routes/tweetlikes');
const tweetComments = require('../routes/tweetcomments');
const retweets = require('../routes/retweets');

module.exports = function (app) {
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
    app.use('/api/retweets', retweets);
    app.use(error);
};
