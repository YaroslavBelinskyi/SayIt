const express = require('express');
const { TweetLike, validateTweetLike } = require('../models/tweetlikes');
const { User } = require('../models/users');
const { Tweet } = require('../models/tweets');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/like/:tweetId', auth, async (req, res) => {
    const { error } = validateTweetLike(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findById(req.body.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    const tweetHasLike = await TweetLike.findOne({
        tweet: req.params.tweetId,
        user: req.body.userId,
    });

    if (!tweetHasLike) {
        const tweetLike = new TweetLike({
            user: req.body.userId,
            tweet: req.params.tweetId,
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

        const modifiedTweet = await Tweet.findById(req.params.tweetId).populate({
            path: 'tweetLikes',
            populate: {
                path: 'user',
                select: 'firstName lastName',
            },
        });
        res.send(modifiedTweet);
    } else {
        const tweetObj = await Tweet.findById(req.params.tweetId);
        const like = await TweetLike.findOneAndDelete({
            user: req.body.userId,
            tweet: req.params.tweetId,
        });
        async function deleteLikeFromTweet(l, tw) {
            tw.tweetLikes.remove(l);
            await tw.save();
        }
        async function deleteLikeFromUser(l, u) {
            u.favorites.remove(l);
            await u.save();
        }
        await deleteLikeFromTweet(like, tweetObj);
        await deleteLikeFromUser(like, user);
        res.send('Like was removed.');
    }
});

module.exports = router;
