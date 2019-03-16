const express = require('express');
const { Tweet, validateTweet, validateTweetEditing } = require('../models/tweets');
const { User } = require('../models/users');

const router = express.Router();

router.get('/all', async (req, res) => {
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweets = await Tweet.find({ 'user._id': req.body.userId }).sort('-creationDate');
    res.send(tweets);
});

router.post('/create', async (req, res) => {
    const { error } = validateTweet(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findById(req.body.userId);
    if (!user) return res.status(400).send('Invalid user.');

    let tweet = new Tweet({
        user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
        },
        tweetText: req.body.tweetText,
        // numberOfLikes: req.body.numberOfLikes,
        // numberOfComments: req.body.numberOfComments,
    });

    // async function addTweetToUser(uId, tw) {
    //     const userObj = await User.findById(uId);
    //     userObj.tweets.push(tw);
    //     userObj.save();
    // }
    // addTweetToUser(user._id, tweet);
    tweet = await tweet.save();
    res.send(tweet);
});

router.delete('/:id', async (req, res) => {
    const tweet = await Tweet.findByIdAndDelete(req.params.id);
    if (!tweet) return res.status(400).send('Tweet was not found.');
    res.send(tweet);
});

router.get('/:id', async (req, res) => {
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(400).send('Tweet was not found.');
    res.send(tweet);
});

router.patch('/:id', async (req, res) => {
    const { error } = validateTweetEditing(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const editedTweet = await Tweet.findByIdAndUpdate(req.params.id,
        {
            tweetText: req.body.newTweetText,
        }, { new: true });
    if (!editedTweet) return res.status(400).send('Tweet was not found');

    res.send(editedTweet);
});

module.exports = router;
