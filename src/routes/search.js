const express = require('express');
const { Tweet } = require('../models/tweets');
const { User } = require('../models/users');

const router = express.Router();

router.post('/users', async (req, res) => {
    if (!req.body.search || req.body.search.trim() === '') return res.status(400).send('Please enter your query!');
    const searchQueriesArray = req.body.search.trim().split(' ');
    // da eto kostil, "map" doesn't solve this problem -_-
    const regexArray = [];
    searchQueriesArray.forEach((e) => {
        regexArray.push(new RegExp(e.trim(), 'i'));
    });
    const results = await User.find({
        $or: [
            {
                userName: {
                    $in: regexArray,
                },
            },
            {
                firstName: {
                    $in: regexArray,
                },
            },
            {
                lastName: {
                    $in: regexArray,
                },
            },
        ],
    })
        .select('_id userName firstName lastName profilePhoto numberOfTweets numberOfFollowers numberOfFollowings')
        .sort('-numberOfFollowers');

    res.send(results);
});

router.post('/tweets', async (req, res) => {
    if (!req.body.search || req.body.search.trim() === '') return res.status(400).send('Please enter your query!');

    const reg = new RegExp(req.body.search.trim(), 'i');
    const results = await Tweet.find({
        tweetText: {
            $in: reg,
        },
    })
        .select('-__v -retweets -tweetLikes -tweetComments -isPinned')
        .populate({
            path: 'user',
            select: 'firstName lastName userName profilePhoto',
        })
        .sort('-creationDate');

    res.send(results);
});

module.exports = router;
