const express = require('express');
const { TweetComment, validateTweetComment } = require('../models/tweetcomments');
const { User } = require('../models/users');
const { Tweet } = require('../models/tweets');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/:tweetId', auth, async (req, res) => {
    const comments = await TweetComment.find({
        tweet: req.params.tweetId,
    }).populate({
        path: 'user',
        select: 'firstName lastName',
    });
    res.send(comments);
});

router.post('/:tweetId', auth, async (req, res) => {
    const { error } = validateTweetComment(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findById(req.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) return res.status(400).send('Tweet was not found.');

    const tweetComment = new TweetComment({
        user: req.userId,
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

router.patch('/:commentId', auth, async (req, res) => {
    const { error } = validateTweetComment(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let tweetComment = await TweetComment.findById(req.params.commentId);
    if (!tweetComment) return res.status(400).send('Comment was not found');

    if (JSON.stringify(tweetComment.user) === JSON.stringify(req.userId)) {
        tweetComment = await TweetComment.findByIdAndUpdate(req.params.commentId,
            { commentText: req.body.commentText }, { new: true });
        res.send(tweetComment);
    } else {
        res.status(400).send('You have no permission to do this.');
    }
});

// router.delete('/:tweetId/:commentId', auth, async (req, res) => {
//     async function deleteCommentFromTweet(tw, com) {
//         await tw.tweetComments.remove(com);
//         tw.numberOfComments -= 1;
//         await tw.save();
//     }

//     const tweet = await Tweet.findById(req.params.tweetId);
//     if (!tweet) return res.status(400).send('Tweet was not found.');

//     let tweetComment = await TweetComment.findById(req.params.commentId);
//     if (!tweetComment) return res.status(400).send('Comment was not found');

//     const isCommentInTweet = await Tweet.findOne({
//         _id: req.params.tweetId,
//         tweetComments: req.params.commentId,
//     });
//     if (!isCommentInTweet) return res.status(400).send('No such comment in the current tweet');

//     if (JSON.stringify(tweetComment.user) === JSON.stringify(req.userId)) {
//         tweetComment = await TweetComment.findByIdAndDelete(req.params.commentId);
//         deleteCommentFromTweet(tweet, req.params.commentId);
//         res.send(tweetComment);
//     } else if (JSON.stringify(tweet.user) === JSON.stringify(req.userId)) {
//         tweetComment = await TweetComment.findByIdAndDelete(req.params.commentId);
//         deleteCommentFromTweet(tweet, req.params.commentId);
//         res.send(tweetComment);
//     } else {
//         res.status(400).send('You have no permission to do this.');
//     }
// });

router.delete('/:commentId', auth, async (req, res) => {
    async function deleteCommentFromTweet(tw, com) {
        console.log(tw.tweetComments);
        await tw.tweetComments.remove(com);
        tw.numberOfComments -= 1;
        await tw.save();
    }

    let tweetComment = await TweetComment.findById(req.params.commentId);
    if (!tweetComment) return res.status(400).send('Comment was not found');
    const tweet = await Tweet.findById(tweetComment.tweet);

    if (JSON.stringify(tweetComment.user) === JSON.stringify(req.userId)) {
        tweetComment = await TweetComment.findByIdAndDelete(req.params.commentId);
        deleteCommentFromTweet(tweet, req.params.commentId);
        res.send(tweetComment);
    } else if (JSON.stringify(tweet.user) === JSON.stringify(req.userId)) {
        tweetComment = await TweetComment.findByIdAndDelete(req.params.commentId);
        deleteCommentFromTweet(tweet, req.params.commentId);
        res.send(tweetComment);
    } else {
        res.status(400).send('You have no permission to do this.');
    }
});

module.exports = router;
