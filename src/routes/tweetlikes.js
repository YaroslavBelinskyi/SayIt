const express = require('express');
const { TweetLike } = require('../models/tweetlikes');
const { User, validateId } = require('../models/users');
const { Tweet } = require('../models/tweets');
const auth = require('../middleware/auth');

const router = express.Router();

// Like\unlike certain tweet by the current logged user and add\remove it to\from his favorites.
router.post('/like/:tweetid', auth, async (req, res) => {
    if (!validateId(req.params.tweetid)) return res.status(422).send('Invalid tweet ID.');
    if (!validateId(req.userId)) return res.status(422).send('Invalid user ID.');

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).send('User not found.');

    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet) return res.status(404).send('Tweet not found.');

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

        const modifiedTweet = await Tweet.findById(req.params.tweetid)
            .select('_id numberOfLikes tweetLikes user')
            .populate({
                path: 'tweetLikes',
                select: '-tweet',
                populate: {
                    path: 'user',
                    select: 'firstName lastName userName profilePhoto',
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

        const modifiedTweet = await Tweet.findById(req.params.tweetid)
            .select('_id numberOfLikes tweetLikes user')
            .populate({
                path: 'tweetLikes',
                select: '-tweet',
                populate: {
                    path: 'user',
                    select: 'firstName lastName userName profilePhoto',
                },
            });
        res.send(modifiedTweet);
    }
});

// Get all likes of certain tweet.
router.get('/likes/:tweetid', async (req, res) => {
    if (!validateId(req.params.tweetid)) return res.status(422).send('Invalid tweet ID.');

    const likes = await Tweet.findById(req.params.tweetid)
        .select('tweetLikes numberOfLikes')
        .populate({
            path: 'tweetLikes',
            select: '-tweet -__v',
            populate: {
                path: 'user',
                select: 'firstName lastName userName profilePhoto',
            },
        })
        .populate({
            path: 'user',
            select: 'firstName lastName userName profilePhoto',
        });
    res.send(likes);
});

module.exports = router;
