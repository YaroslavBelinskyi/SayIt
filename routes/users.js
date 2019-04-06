const express = require('express');
const bcrypt = require('bcrypt');
const {
    User, validateUser, validateUserUpdate, validateId,
} = require('../models/users');
const { Tweet } = require('../models/tweets');
const { TweetComment } = require('../models/tweetcomments');
const { TweetLike } = require('../models/tweetlikes');
const auth = require('../middleware/auth');

const router = express.Router();

// Get the list of all users.
router.get('/all', async (req, res) => {
    const users = await User.find().sort('-numberOfFollowers');
    res.send(users);
});

// Get one user.
router.get('/:userid', async (req, res) => {
    const isValidId = validateId(req.params.userid);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    let user = await User.findById(req.params.userid);
    if (!user) return res.status(400).send('Invalid user.');

    user = await User.findById(req.params.userid).populate('tweets');
    res.send(user);
});

// Create new user.
router.post('/new', async (req, res) => {
    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).send('Email is already register.');

    user = await User.findOne({ userName: req.body.userName });
    if (user) return res.status(400).send('User name is already taken.');

    // let dateOfBirth;
    // if (req.body.DOB) dateOfBirth = new Date(req.body.DOB);
    user = new User({
        userName: req.body.userName,
        email: req.body.email,
        password: req.body.password,
        DOB: req.body.DOB,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
    });
    const salt = await bcrypt.genSalt(8);
    user.password = await bcrypt.hash(user.password, salt);
    await user.save();

    const token = user.generateAuthToken();
    res.header('x-auth-token', token).send({
        _id: user._id,
        userName: user.userName,
        email: user.email,
    });
});

// Update information of the current logged user.
router.patch('/updateme', auth, async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(400).send('Invalid user.');

    const { error } = validateUserUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const checkEmail = await User.findOne({ email: req.body.email });
    if (checkEmail) return res.status(400).send('Email is already taken.');

    const checkUserName = await User.findOne({ userName: req.body.userName });
    if (checkUserName) return res.status(400).send('Username is already taken.');

    const updatedUser = await User.findByIdAndUpdate(req.userId, {
        userName: req.body.userName,
        email: req.body.email,
        password: req.body.password,
        DOB: req.body.DOB,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
    }, { new: true });
    const salt = await bcrypt.genSalt(8);
    updatedUser.password = await bcrypt.hash(updatedUser.password, salt);
    await updatedUser.save();

    res.send(updatedUser);
});

// Follow one certain user.
router.post('/follow/:userid', auth, async (req, res) => {
    const isValidId = validateId(req.params.userid);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.params.userid);
    if (!user) return res.status(400).send('Invalid user.');

    const isValidCurrentId = validateId(req.userId);
    if (!isValidCurrentId) return res.status(400).send('Invalid current user ID.');

    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(400).send('Invalid user.');

    if (req.params.userid === req.userId) return res.status(400).send('You cannot follow yourself.');

    const isFollowed = await User.findOne({
        _id: req.userId,
        followings: req.params.userid,
    });
    if (!isFollowed) {
        async function addUserToFollowings(u, userToFollow) {
            u.followings.push(userToFollow);
            u.numberOfFollowings += 1;
            await u.save();
        }
        async function addUserToFollowers(u, followerUser) {
            u.followers.push(followerUser);
            u.numberOfFollowers += 1;
            await u.save();
        }
        addUserToFollowings(currentUser, user);
        addUserToFollowers(user, currentUser);
        res.send(user);
    } else {
        async function unfollowUser(u, userToUnfollow) {
            u.followings.remove(userToUnfollow);
            u.numberOfFollowings -= 1;
            await u.save();
        }
        async function deleteUserFromFollowers(u, followerUser) {
            u.followers.remove(followerUser);
            u.numberOfFollowers -= 1;
            await u.save();
        }
        unfollowUser(currentUser, user);
        deleteUserFromFollowers(user, currentUser);
        res.send(user);
    }
});

// Get the list of all followers of the certain user.
router.get('/followers/:userid', async (req, res) => {
    const isValidId = validateId(req.params.userid);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.params.userid)
        .select('followers, numberOfFollowers')
        .populate({
            path: 'followers',
            select: 'firstName lastName',
        });
    if (!user) return res.status(400).send('Invalid user.');
    res.send(user);
});

// Get the list of all followings of the certain user.
router.get('/followings/:userid', async (req, res) => {
    const isValidId = validateId(req.params.userid);
    if (!isValidId) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.params.userid)
        .select('followings, numberOfFollowings')
        .populate({
            path: 'followings',
            select: 'firstName lastName',
        });
    if (!user) return res.status(400).send('Invalid user.');
    res.send(user);
});

// Delete current logged user.
router.delete('/deleteme', auth, async (req, res) => {
    const isValidCurrentId = validateId(req.userId);
    if (!isValidCurrentId) return res.status(400).send('Invalid current user ID.');

    const user = await User.findByIdAndDelete(req.userId);
    if (!user) return res.status(400).send('Ivalid user.');

    await Tweet.deleteMany({
        user: req.params.id,
    });
    await TweetComment.deleteMany({
        user: req.params.id,
    });
    await TweetLike.deleteMany({
        user: req.params.id,
    });

    // const tweets = Tweet.find().populate({
    //     path: 'tweetComments',
    // });
    // async function deleteAllCommentsFromTweets(tw, com) {
    //     await tw.tweetComments.remove(com);
    //     tw.numberOfComments -= 1;
    //     await tw.save();
    // }
    // async function deleteAllLikesFromTweet(l, tw) {
    //     tw.tweetLikes.remove(l);
    //     await tw.save();
    // }
    // deleteAllCommentsFromTweets(tweet, req.body.commentId);
    // deleteAllLikesFromTweet(like, tweetObj);

    res.send(user);
});

module.exports = router;
