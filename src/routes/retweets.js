const express = require('express');
const { Retweet, validateRetweet } = require('../models/retweets');
const { User, validateId } = require('../models/users');
const { Tweet } = require('../models/tweets');
const auth = require('../middleware/auth');

const router = express.Router();

// Get one retweet.
router.get('/:retweetid', async (req, res) => {
    if (!validateId(req.params.retweetid)) return res.status(400).send('Invalid retweet ID.');

    const retweetWithTweet = await Retweet.findById(req.params.retweetid)
        .populate({
            path: 'user',
            select: 'firstName lastName userName profilePhoto',
        })
        .populate({
            path: 'tweet',
            select: 'tweetText numberOfLikes tags images numberOfComments numberOfRetweets creationDate',
            populate: {
                path: 'user',
                select: 'firstName lastName userName profilePhoto',
            },
        });
    if (!retweetWithTweet) return res.status(400).send('Retweet was not found.');
    res.send(retweetWithTweet);
});


// Get all user's retweets.
router.get('/all/:userid', async (req, res) => {
    if (!validateId(req.params.userid)) return res.status(400).send('Invalid user ID.');

    const retweets = await User.findById(req.params.userid)
        .select('retweets firstName lastName userName profilePhoto')
        .populate({
            path: 'retweets',
            select: '-user',
            populate: {
                path: 'tweet',
                select: 'tweetText numberOfLikes tags images numberOfComments numberOfRetweets creationDate',
                populate: {
                    path: 'user',
                    select: 'firstName lastName userName profilePhoto',
                },
            },
        });
    if (!retweets) return res.status(400).send('User was not found.');
    res.send(retweets);
});

// Make a retweet for the certain tweet from the current logged user.
router.post('/share/:tweetid', auth, async (req, res) => {
    if (!validateId(req.params.tweetid)) return res.status(400).send('Invalid tweet ID.');
    if (!validateId(req.userId)) return res.status(400).send('Invalid user ID.');

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
                select: 'firstName lastName userName profilePhoto',
            })
            .populate({
                path: 'tweet',
                select: 'tweetText numberOfLikes tags images numberOfComments numberOfRetweets creationDate',
                populate: {
                    path: 'user',
                    select: 'firstName lastName userName profilePhoto',
                },
            });
        res.send(retweetWithTweet);
    } else {
        res.send('Tweet has been already retweeted');
    }
});

// Update the comment of the certain tweet if it was created by the current logged user.
router.patch('/update/:retweetid', auth, async (req, res) => {
    if (!validateId(req.params.retweetid)) return res.status(400).send('Invalid retweet ID.');
    if (!validateId(req.userId)) return res.status(400).send('Invalid user ID.');

    const { error } = validateRetweet(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let retweet = await Retweet.findById(req.params.retweetid);
    if (!retweet) return res.status(400).send('Retweet was not found');

    if (retweet.user.toString() === req.userId) {
        retweet = await Retweet.findByIdAndUpdate(req.params.retweetid,
            { retweetText: req.body.retweetText }, { new: true });

        const editedRetweet = await Retweet.findById(retweet._id)
            .populate({
                path: 'user',
                select: 'firstName lastName userName profilePhoto',
            })
            .populate({
                path: 'tweet',
                select: 'tweetText tags images numberOfLikes numberOfComments numberOfRetweets creationDate',
                populate: {
                    path: 'user',
                    select: 'firstName lastName userName profilePhoto',
                },
            });
        res.send(editedRetweet);
    } else {
        res.status(400).send('You have no permission to do this.');
    }
});

// Delete the comment if it was created under current logged user's tweet or by the current user.
router.delete('/delete/:retweetid', auth, async (req, res) => {
    if (!validateId(req.params.retweetid)) return res.status(400).send('Invalid retweet ID.');
    if (!validateId(req.userId)) return res.status(400).send('Invalid user ID.');

    let retweet = await Retweet.findById(req.params.retweetid);
    if (!retweet) return res.status(400).send('Retweet was not found');
    const tweet = await Tweet.findById(retweet.tweet);
    const user = await User.findById(retweet.user);

    async function deleteRetweetFromTweet(tw, rtw) {
        tw.retweets.remove(rtw);
        tw.numberOfRetweets -= 1;
        await tw.save();
    }
    async function deleteRetweetFromUser(u, rtw) {
        u.retweets.remove(rtw);
        u.numberOfRetweets -= 1;
        await u.save();
    }

    if (retweet.user.toString() === req.userId) {
        retweet = await Retweet.findByIdAndDelete(req.params.retweetid);
        await deleteRetweetFromTweet(tweet, req.params.retweetid);
        await deleteRetweetFromUser(user, req.params.retweetid);
        res.send(retweet);
    } else {
        res.status(400).send('You have no permission to do this.');
    }
});

module.exports = router;
