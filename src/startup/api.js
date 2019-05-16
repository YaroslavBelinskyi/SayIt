const express = require('express');
const users = require('../routes/users');
const auth = require('../routes/auth');
const tweets = require('../routes/tweets');
const tweetLikes = require('../routes/tweetlikes');
const tweetComments = require('../routes/tweetcomments');
const retweets = require('../routes/retweets');
const search = require('../routes/search');

const router = express.Router();

router.use('/users', users);
router.use('/auth', auth);
router.use('/tweets', tweets);
router.use('/tweetlikes', tweetLikes);
router.use('/tweetcomments', tweetComments);
router.use('/retweets', retweets);
router.use('/search', search);

module.exports = router;
