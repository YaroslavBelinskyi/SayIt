const express = require('express');
const { Tweet, validateTweet } = require('../models/tweets');
const { User, validateId } = require('../models/users');
const { TweetComment } = require('../models/tweetcomments');
const { TweetLike } = require('../models/tweetlikes');
const { Retweet } = require('../models/retweets');
const auth = require('../middleware/auth');

const router = express.Router();

// Get the list of all tweets of certain user.
router.get('/all/:userid', async (req, res) => {
    const isValidId = validateId(req.params.userid);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.params.userid);
    if (!user) return res.status(400).send('Invalid user.');

    const tweets = await Tweet.find({ user: req.params.userid })
        .select('-__v -retweets -tweetLikes -tweetComments')
        .populate({
            path: 'user',
            select: 'firstName lastName userName profilePhoto',
        })
        .sort('-creationDate');
    res.send(tweets);
});

// Get the feed with all tweets and retweets of folowing users for the current logged user.
router.get('/feed', auth, async (req, res) => {
    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const allTweets = await User.findById(req.userId)
        .select('followings -_id')
        .populate({
            path: 'followings',
            select: 'tweets retweets',
            populate: {
                path: 'tweets retweets',
                select: 'tweetText creationDate tweet retweetText numberOfLikes numberOfComments numberOfRetweets',
                populate: {
                    path: 'user tweet',
                    select: 'firstName lastName profilePhoto tweetText creationDate userName numberOfLikes numberOfComments numberOfRetweets',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName userName profilePhoto',
                    },
                },
            },
        });
    const feed = [];
    allTweets.followings.forEach((e) => {
        e.tweets.forEach((t) => {
            feed.push(t);
        });
        e.retweets.forEach((rt) => {
            feed.push(rt);
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
            select: 'tweet',
            populate: {
                path: 'tweet',
                select: '-tweetLikes -tweetComments -retweets -__v',
                populate: {
                    path: 'user',
                    select: 'firstName lastName userName profilePhoto',
                },
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
    await addTweetToUser(user, tweet);
    await tweet.save();

    const modifyedTweet = await Tweet.findById(tweet._id)
        .select('-tweetLikes -tweetComments -retweets')
        .populate({
            path: 'user',
            select: 'firstName lastName userName profilePhoto',
        });
    res.send(modifyedTweet);
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

    await Tweet.findById(req.params.tweetid, async (err, tw) => {
        await TweetComment.deleteMany({
            _id: {
                $in: tw.tweetComments,
            },
        });
        await TweetLike.deleteMany({
            _id: {
                $in: tw.tweetLikes,
            },
        });
        await Retweet.deleteMany({
            _id: {
                $in: tw.retweets,
            },
        });
        if (err) throw err;
    });

    tweet = await Tweet.findByIdAndDelete(req.params.tweetid);

    const user = await User.findById(tweet.user);
    if (!user) return res.status(400).send('Invalid user.');

    async function removeTweetFromUser(u) {
        await u.tweets.remove(req.params.tweetid);
        u.numberOfTweets -= 1;
        await u.save();
    }

    async function removeTweetFromFavorites(tweetid) {
        await TweetLike.find({ tweet: tweetid }, async (err, likesArray) => {
            if (err) throw err;
            async function deleteLikeFromUser(l, u) {
                await u.favorites.remove(l);
                await u.save();
            }
            likesArray.forEach(async (like) => {
                const userObj = await User.findOne(like.user);
                await deleteLikeFromUser(like, userObj);
            });
        });
    }
    async function removeTweetFromRetweets(tweetid) {
        await Retweet.find({ tweet: tweetid }, async (err, retweetsArray) => {
            if (err) throw err;
            async function deleteLikeFromUser(rt, u) {
                await u.retweets.remove(rt);
                await u.save();
            }
            retweetsArray.forEach(async (retweet) => {
                const userObj = await User.findOne(retweet.user);
                await deleteLikeFromUser(retweet, userObj);
            });
        });
    }
    await removeTweetFromRetweets(req.params.tweetid);
    await removeTweetFromFavorites(req.params.tweetid);
    await removeTweetFromUser(user);
    res.send(tweet);
});

// Get the certain tweet.
router.get('/:tweetid', async (req, res) => {
    const isValidTweetId = validateId(req.params.tweetid);
    if (!isValidTweetId) return res.status(400).send('Invalid tweet ID.');

    const tweet = await Tweet.findById(req.params.tweetid)
        .select('-retweets -tweetLikes -__v')
        .populate({
            path: 'user',
            select: 'firstName lastName userName profilePhoto',
        })
        .populate({
            path: 'tweetComments',
            select: 'commentText creationgDate user',
            populate: {
                path: 'user',
                select: 'firstName lastName userName profilePhoto',
            },
        });
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

    const { error } = validateTweet(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let updatedTweet = await Tweet.findByIdAndUpdate(req.params.tweetid,
        { tweetText: req.body.tweetText }, { new: true });
    if (!updatedTweet) return res.status(400).send('Tweet was not found.');

    updatedTweet = await Tweet.findById(req.params.tweetid)
        .select('-tweetLikes -tweetComments -retweets')
        .populate({
            path: 'user',
            select: 'firstName lastName userName profilePhoto',
        });
    res.send(updatedTweet);
});

module.exports = router;
