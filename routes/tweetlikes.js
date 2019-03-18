const express = require('express');
const { TweetLike, validateTweetLike } = require('../models/tweetlikes');
const { User } = require('../models/users');
const { Tweet } = require('../models/tweets');

const router = express.Router();

router.patch('/like/:tweetId', async (req, res) => {
    const { error } = validateTweetLike(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findById(req.body.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    const tweetWithLike = await TweetLike.find({
        tweet: req.params.tweetId,
        user: req.body.userId,
    });
    console.log(!tweetWithLike.length);
    if (!tweetWithLike.length) {
        const tweetLike = new TweetLike({
            user: req.body.userId,
            tweet: req.params.tweetId,
        });
        async function addLiketoTweet(l, tw) {
            tw.tweetLikes.push(l);
            await tw.save();
        }
        await addLiketoTweet(tweetLike, tweet);
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
        });
        async function deleteLikeFromTweet(l, tw) {
            tw.tweetLikes.remove(l);
            await tw.save();
        }
        deleteLikeFromTweet(like, tweetObj);
        res.send('Like was removed.');
    }
});

module.exports = router;
