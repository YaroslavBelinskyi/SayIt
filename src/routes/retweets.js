const express = require('express');
const { Retweet, validateRetweet } = require('../models/retweets');
const { User, validateId } = require('../models/users');
const { Tweet } = require('../models/tweets');
const auth = require('../middleware/auth');

const router = express.Router();

// Get one retweet.
router.get('/:retweetid', async (req, res) => {
    const isValidTweetId = validateId(req.params.retweetid);
    if (!isValidTweetId) return res.status(400).send('Invalid retweet ID.');

    const retweetWithTweet = await Retweet.findById(req.params.retweetid)
        .populate({
            path: 'user',
            select: 'firstName lastName creationDate',
        })
        .populate({
            path: 'tweet',
            select: 'tweetText numberOfLikes numberOfComments numberOfRetweets creationDate',
            populate: {
                path: 'user',
                select: 'firstName lastName',
            },
        });
    if (!retweetWithTweet) return res.status(400).send('Retweet was not found.');
    res.send(retweetWithTweet);
});


// Get all user's retweets.
router.get('/all/:userid', async (req, res) => {
    const isValidUserId = validateId(req.params.userid);
    if (!isValidUserId) return res.status(400).send('Invalid user ID.');

    const retweets = await User.findById(req.params.userid).select('retweets firstName lastName')
        .populate({
            path: 'retweets',
            select: '-user',
            populate: {
                path: 'tweet',
                select: 'tweetText numberOfLikes numberOfComments numberOfRetweets creationDate',
                populate: {
                    path: 'user',
                    select: 'firstName lastName',
                },
            },
        });
    if (!retweets) return res.status(400).send('User was not found.');
    res.send(retweets);
});

// Make a retweet for the certain tweet from the current logged user.
router.post('/share/:tweetid', auth, async (req, res) => {
    const isValidTweetId = validateId(req.params.tweetid);
    if (!isValidTweetId) return res.status(400).send('Invalid tweet ID.');

    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    const { error } = validateRetweet(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const tweetHasRetweet = await Retweet.findOne({
        tweet: req.params.tweetid,
        user: req.userId,
    });
    if (!tweetHasRetweet) {
        const retweet = new Retweet({
            user: req.userId,
            retweetText: req.body.retweetText,
            tweet: req.params.tweetid,
        });

        async function addRetweetToComment(tw, retw) {
            tw.retweets.push(retw);
            tw.numberOfRetweets += 1;
            await tw.save();
        }

        async function addRetweetToUser(u, retw) {
            u.retweets.push(retw);
            u.numberOfRetweets += 1;
            await u.save();
        }

        await addRetweetToComment(tweet, retweet);
        await addRetweetToUser(user, retweet);
        await retweet.save();

        const retweetWithTweet = await Retweet.findById(retweet._id)
            .populate({
                path: 'user',
                select: 'firstName lastName creationDate',
            })
            .populate({
                path: 'tweet',
                select: 'tweetText numberOfLikes numberOfComments numberOfRetweets creationDate',
                populate: {
                    path: 'user',
                    select: 'firstName lastName',
                },
            });
        res.send(retweetWithTweet);
    } else {
        res.send('Tweet has been already retweeted');
    }
});

// Update the comment of the certain tweet if it was created by the current logged user.
router.patch('/update/:retweetid', auth, async (req, res) => {
    const { error } = validateRetweet(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const isValidRetweeetId = validateId(req.params.retweetid);
    if (!isValidRetweeetId) return res.status(400).send('Invalid retweet ID.');

    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    let retweet = await Retweet.findById(req.params.retweetid);
    if (!retweet) return res.status(400).send('Retweet was not found');

    if (JSON.stringify(retweet.user) === JSON.stringify(req.userId)) {
        retweet = await Retweet.findByIdAndUpdate(req.params.retweetid,
            { retweetText: req.body.retweetText }, { new: true });

        const editedRetweet = await Retweet.findById(retweet._id)
            .populate({
                path: 'user',
                select: 'firstName lastName creationDate',
            })
            .populate({
                path: 'tweet',
                select: 'tweetText numberOfLikes numberOfComments numberOfRetweets creationDate',
                populate: {
                    path: 'user',
                    select: 'firstName lastName',
                },
            });
        res.send(editedRetweet);
    } else {
        res.status(400).send('You have no permission to do this.');
    }
});

// Delete the comment if it was created under current logged user's tweet or by the current user.
router.delete('/delete/:retweetid', auth, async (req, res) => {
    async function deleteRetweetFromTweet(tw, rtw) {
        await tw.retweets.remove(rtw);
        tw.numberOfRetweets -= 1;
        await tw.save();
    }
    async function deleteRetweetFromUser(u, rtw) {
        u.retweets.remove(rtw);
        u.numberOfRetweets -= 1;
        await u.save();
    }
    const isValidRetweeetId = validateId(req.params.retweetid);
    if (!isValidRetweeetId) return res.status(400).send('Invalid retweet ID.');

    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    let retweet = await Retweet.findById(req.params.retweetid);
    if (!retweet) return res.status(400).send('Retweet was not found');

    const tweet = await Tweet.findById(retweet.tweet);
    const user = await User.findById(retweet.user);

    if (JSON.stringify(retweet.user) === JSON.stringify(req.userId)) {
        retweet = await Retweet.findByIdAndDelete(req.params.retweetid);
        deleteRetweetFromTweet(tweet, req.params.retweetid);
        deleteRetweetFromUser(user, req.params.retweetid);
        res.send(retweet);
    } else {
        res.status(400).send('You have no permission to do this.');
    }
});

module.exports = router;
