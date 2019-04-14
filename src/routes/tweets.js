const express = require('express');
const { Tweet, validateTweet, validateTweetEditing } = require('../models/tweets');
const { User, validateId } = require('../models/users');
const auth = require('../middleware/auth');

const router = express.Router();

// Get the list of all tweets of certain user.
router.get('/all/:userid', async (req, res) => {
    const isValidId = validateId(req.params.userid);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.params.userid);
    if (!user) return res.status(400).send('Invalid user.');

    const tweets = await Tweet.find({ user: req.params.userid }).sort('-creationDate');
    res.send(tweets);
});

// Get the feed with all tweets of folowing users for the current logged user.
router.get('/feed', auth, async (req, res) => {
    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

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

// Get the list of all favorites tweets (liked tweets) for the current user.
router.get('/favorites', auth, async (req, res) => {
    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const favorites = await User.findById(req.userId).select('favorites')
        .populate({
            path: 'favorites',
            populate: {
                path: 'tweet',
                select: '-tweetLikes -tweetComments',
            },
        });
    res.send(favorites);
});

// Create a new tweet for the current logged user.
router.post('/create', auth, async (req, res) => {
    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const { error } = validateTweet(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const tweet = new Tweet({
        user: {
            _id: user._id,
        },
        tweetText: req.body.tweetText,
    });

    async function addTweetToUser(u, tw) {
        u.tweets.push(tw._id);
        u.numberOfTweets += 1;
        await u.save();
    }
    addTweetToUser(user, tweet);
    await tweet.save();
    res.send(tweet);
});

// Delete certain tweet created by the current logged user.
router.delete('/delete/:tweetid', auth, async (req, res) => {
    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const isValidTweetId = validateId(req.params.tweetid);
    if (!isValidTweetId) return res.status(400).send('Invalid tweet ID.');

    let tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet) return res.status(400).send('Tweet was not found.');
    if (JSON.stringify(tweet.user) !== JSON.stringify(req.userId)) return res.status(400).send('You have no permission to do this.');

    tweet = await Tweet.findByIdAndDelete(req.params.tweetid);

    const user = await User.findById(tweet.user);
    if (!user) return res.status(400).send('Invalid user.');

    async function removeTweetFromUser(u) {
        u.tweets.remove(req.params.tweetid);
        u.numberOfTweets -= 1;
        await u.save();
    }

    // need to add deleting all comments and all likes and favorites.

    removeTweetFromUser(user);
    res.send(tweet);
});

// Get the certain tweet.
router.get('/:tweetid', async (req, res) => {
    const isValidTweetId = validateId(req.params.tweetid);
    if (!isValidTweetId) return res.status(400).send('Invalid tweet ID.');

    const tweet = await Tweet.findById(req.params.tweetid).populate('user');
    if (!tweet) return res.status(400).send('Tweet was not found.');
    res.send(tweet);
});

// Update certain tweet created by the current logged user.
router.patch('/update/:tweetid', auth, async (req, res) => {
    const isValidTweetId = validateId(req.params.tweetid);
    if (!isValidTweetId) return res.status(400).send('Invalid tweet ID.');

    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const tweet = await Tweet.findById(req.params.tweetid);
    if (JSON.stringify(tweet.user) !== JSON.stringify(req.userId)) return res.status(400).send('You have no permission to do this.');

    const { error } = validateTweetEditing(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const updatedTweet = await Tweet.findByIdAndUpdate(req.params.tweetid,
        { tweetText: req.body.newTweetText }, { new: true });
    if (!updatedTweet) return res.status(400).send('Tweet was not found.');

    res.send(updatedTweet);
});

module.exports = router;