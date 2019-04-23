const express = require('express');
const { TweetLike } = require('../models/tweetlikes');
const { User, validateId } = require('../models/users');
const { Tweet } = require('../models/tweets');
const auth = require('../middleware/auth');

const router = express.Router();

// Like\unlike certain tweet by the current logged user and add\remove it to\from his favorites.
router.post('/like/:tweetid', auth, async (req, res) => {
    const isValidTweetId = validateId(req.params.tweetid);
    if (!isValidTweetId) return res.status(400).send('Invalid tweet ID.');

    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    const tweetHasLike = await TweetLike.findOne({
        tweet: req.params.tweetid,
        user: req.userId,
    });

    if (!tweetHasLike) {
        const tweetLike = new TweetLike({
            user: req.userId,
            tweet: req.params.tweetid,
        });
        async function addLiketoTweet(l, tw) {
            tw.tweetLikes.push(l);
            tw.numberOfLikes += 1;
            await tw.save();
        }
        async function addLiketoUser(l, u) {
            u.favorites.push(l);
            await u.save();
        }
        await addLiketoTweet(tweetLike, tweet);
        await addLiketoUser(tweetLike, user);
        await tweetLike.save();

        const modifiedTweet = await Tweet.findById(req.params.tweetid).populate({
            path: 'tweetLikes',
            populate: {
                path: 'user',
                select: 'firstName lastName userName',
            },
        });
        res.send(modifiedTweet);
    } else {
        const tweetObj = await Tweet.findById(req.params.tweetid);
        const like = await TweetLike.findOneAndDelete({
            user: req.userId,
            tweet: req.params.tweetid,
        });
        async function deleteLikeFromTweet(l, tw) {
            tw.tweetLikes.remove(l);
            tw.numberOfLikes -= 1;
            await tw.save();
        }
        async function deleteLikeFromUser(l, u) {
            u.favorites.remove(l);
            await u.save();
        }
        await deleteLikeFromTweet(like, tweetObj);
        await deleteLikeFromUser(like, user);

        const modifiedTweet = await Tweet.findById(req.params.tweetid).populate({
            path: 'tweetLikes',
            populate: {
                path: 'user',
                select: 'firstName lastName userName',
            },
        });
        res.send(modifiedTweet);
    }
});

module.exports = router;
