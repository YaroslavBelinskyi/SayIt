const express = require('express');
const {
    Tweet, validateTweet, validateTweetEditing,
} = require('../models/tweets');
const { User } = require('../models/users');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/all', async (req, res) => {
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweets = await Tweet.find({ user: req.body.userId }).sort('-creationDate');
    res.send(tweets);
});

router.get('/feed', auth, async (req, res) => {
    const allTweets = await User.findById(req.userId)
        .select('followings -_id')
        .populate({
            path: 'followings',
            select: 'tweets',
            populate: {
                path: 'tweets',
                select: 'tweetText creationDate',
                populate: {
                    path: 'user',
                    select: 'firstName lastName',
                },
            },
        });
    const feed = [];
    allTweets.followings.forEach((e) => {
        e.tweets.forEach((e1) => {
            feed.push(e1);
        });
    });
    const sortedFeed = feed.sort((a, b) => b.creationDate - a.creationDate);
    res.send(sortedFeed);
});

router.get('/favorites/:id', auth, async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(400).send('Invalid user.');

    const favorites = await User.findById(req.params.id).populate('favorites');
    res.send(favorites);
});

router.post('/create', auth, async (req, res) => {
    const { error } = validateTweet(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findById(req.body.userId);
    if (!user) return res.status(400).send('Invalid user.');

    let tweet = new Tweet({
        user: {
            _id: user._id,
        },
        tweetText: req.body.tweetText,
    });

    async function addTweetToUser(uId, tw) {
        const userObj = await User.findById(uId);
        userObj.tweets.push(tw._id);
        await userObj.save();
    }
    addTweetToUser(user._id, tweet);
    tweet = await tweet.save();
    res.send(tweet);
});

router.delete('/:id', auth, async (req, res) => {
    const tweet = await Tweet.findByIdAndDelete(req.params.id);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    const user = await User.findById(tweet.user);
    if (!user) return res.status(400).send('Invalid user.');

    async function removeTweetFromUser(u) {
        await u.tweets.remove(req.params.id);
        await u.save();
    }

    removeTweetFromUser(user);
    res.send(tweet);
});

router.get('/:id', async (req, res) => {
    const tweet = await Tweet.findById(req.params.id).populate('user');
    if (!tweet) return res.status(400).send('Tweet was not found.');
    res.send(tweet);
});

router.patch('/:id', auth, async (req, res) => {
    const { error } = validateTweetEditing(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const editedTweet = await Tweet.findByIdAndUpdate(req.params.id,
        { tweetText: req.body.newTweetText }, { new: true });
    if (!editedTweet) return res.status(400).send('Tweet was not found.');

    res.send(editedTweet);
});

module.exports = router;
