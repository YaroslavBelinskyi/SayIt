const express = require('express');
const { TweetComment, validateTweetComment } = require('../models/tweetcomments');
const { User } = require('../models/users');
const { Tweet } = require('../models/tweets');

const router = express.Router();

router.get('/:tweetId', async (req, res) => {
    const comments = await TweetComment.find({
        tweet: req.params.tweetId,
    }).populate({
        path: 'user',
        select: 'firstName lastName',
    });
    res.send(comments);
});

router.post('/:tweetId', async (req, res) => {
    const { error } = validateTweetComment(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findById(req.body.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    const tweetComment = new TweetComment({
        user: req.body.userId,
        commentText: req.body.commentText,
        tweet: req.params.tweetId,
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
            select: 'firstName lastName',
        })
        .populate({
            path: 'tweet',
            select: 'numberOfComments',
        });
    res.send(tweetWithComment);
});

router.delete('/:tweetId', async (req, res) => {
    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    const tweetComment = await TweetComment.findByIdAndDelete(req.body.commentId);
    if (!tweetComment) return res.status(400).send('Comment was not found');

    async function deleteCommentFromTweet(tw, com) {
        await tw.tweetComments.remove(com);
        tw.numberOfComments -= 1;
        await tw.save();
    }

    deleteCommentFromTweet(tweet, req.body.commentId);
    res.send(tweetComment);
});

module.exports = router;
