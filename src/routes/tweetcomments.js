const express = require('express');
const { TweetComment, validateTweetComment } = require('../models/tweetcomments');
const { User, validateId } = require('../models/users');
const { Tweet } = require('../models/tweets');
const auth = require('../middleware/auth');

const router = express.Router();

// Get the list of all comments of the certain tweet.
router.get('/all/:tweetid', auth, async (req, res) => {
    const isValidTweetId = validateId(req.params.tweetid);
    if (!isValidTweetId) return res.status(400).send('Invalid tweet ID.');

    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const comments = await TweetComment.find({ tweet: req.params.tweetid })
        .populate({
            path: 'user',
            select: 'firstName lastName userName profilePhoto',
        });
    res.send(comments);
});

// Create a new comment for the certain tweet from the current logged user.
router.post('/create/:tweetid', auth, async (req, res) => {
    const isValidTweetId = validateId(req.params.tweetid);
    if (!isValidTweetId) return res.status(400).send('Invalid tweet ID.');

    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    const { error } = validateTweetComment(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const tweetComment = new TweetComment({
        user: req.userId,
        commentText: req.body.commentText,
        tweet: req.params.tweetid,
    });

    async function addTweetToComment(tw, com) {
        tw.tweetComments.push(com);
        tw.numberOfComments += 1;
        await tw.save();
    }

    addTweetToComment(tweet, tweetComment);
    await tweetComment.save();
    const tweetWithComment = await TweetComment.findById(tweetComment._id)
        .populate({
            path: 'user',
            select: 'firstName lastName userName profilePhoto',
        })
        .populate({
            path: 'tweet',
            select: 'numberOfComments',
        });
    res.send(tweetWithComment);
});

// Update the comment of the certain tweet if it was created by the current logged user.
router.patch('/update/:commentid', auth, async (req, res) => {
    const { error } = validateTweetComment(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const isValidCommentId = validateId(req.params.commentid);
    if (!isValidCommentId) return res.status(400).send('Invalid tweet ID.');

    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    let tweetComment = await TweetComment.findById(req.params.commentid);
    if (!tweetComment) return res.status(400).send('Comment was not found');

    if (JSON.stringify(tweetComment.user) === JSON.stringify(req.userId)) {
        tweetComment = await TweetComment.findByIdAndUpdate(req.params.commentid,
            { commentText: req.body.commentText }, { new: true });
        res.send(tweetComment);
    } else {
        res.status(400).send('You have no permission to do this.');
    }
});

// Delete the comment if it was created under current logged user's tweet or by the current user.
router.delete('/delete/:commentid', auth, async (req, res) => {
    async function deleteCommentFromTweet(tw, com) {
        await tw.tweetComments.remove(com);
        tw.numberOfComments -= 1;
        await tw.save();
    }

    const isValidCommentId = validateId(req.params.commentid);
    if (!isValidCommentId) return res.status(400).send('Invalid comment ID.');

    const isValidId = validateId(req.userId);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    let tweetComment = await TweetComment.findById(req.params.commentid);
    if (!tweetComment) return res.status(400).send('Comment was not found');

    const tweet = await Tweet.findById(tweetComment.tweet);

    if (JSON.stringify(tweetComment.user) === JSON.stringify(req.userId)) {
        tweetComment = await TweetComment.findByIdAndDelete(req.params.commentid);
        deleteCommentFromTweet(tweet, req.params.commentid);
        res.send(tweetComment);
    } else if (JSON.stringify(tweet.user) === JSON.stringify(req.userId)) {
        tweetComment = await TweetComment.findByIdAndDelete(req.params.commentid);
        deleteCommentFromTweet(tweet, req.params.commentid);
        res.send(tweetComment);
    } else {
        res.status(400).send('You have no permission to do this.');
    }
});

module.exports = router;
