const express = require('express');
const {
    User, Tweet, TweetLike, validateTweetLike,
} = require('../models/tweetlikes');

const router = express.Router();

router.patch('/like/:id', async (req, res) => {
    const { error } = validateTweetLike(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let user = await User.findById(req.body.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    user = new TweetLike({
        _id: req.body.userId,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
    });
    async function likeTweet(tw, u) {
        tw.listOfLikes.push(u);
        tw.save();
    }
    likeTweet(tweet, user);
    res.send(user);
});

router.patch('/unlike/:id', async (req, res) => {
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    async function removeTweetLike(tw, uId) {
        const u = tw.listOfLikes.id(uId);
        tw.listOfLikes.remove(u);
        tw.save();
    }
    removeTweetLike(tweet, req.body.userId);
    res.send(user.id);
});

module.exports = router;
