const express = require('express');
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary');
const {
    User, validateUser, validateUserUpdate, validateId,
} = require('../models/users');
const auth = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/photouploader');

const router = express.Router();

// Get the list of all users.
router.get('/all', async (req, res) => {
    const users = await User.find()
        .select('firstName lastName userName profilePhoto _id numberOfFollowers numberOfFollowings numberOfTweets numberOfRetweets pinnedTweet')
        .populate({
            path: 'pinnedTweet',
            select: 'tweetText images tags numberOfLikes numberOfComments numberOfRetweets creationDate isPinned',
        })
        .sort('-numberOfFollowers');
    res.send(users);
});

// Get one user.
router.get('/:userid', async (req, res) => {
    if (!validateId(req.params.userid)) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.params.userid)
        .select('-password -__v -followings -followers -favorites -email -profilePhotoId -retweets')
        .populate({
            path: 'tweets',
            select: '-tweetLikes -tweetComments -__v -retweets -imagesIds',
            populate: {
                path: 'user',
                select: 'userName firstName lastName profilePhoto',
            },
        })
        .populate({
            path: 'pinnedTweet',
            select: '-tweetLikes -tweetComments -__v -retweets',
            populate: {
                path: 'user',
                select: 'userName firstName lastName profilePhoto',
            },
        });

    if (!user) return res.status(400).send('Invalid user.');
    res.send(user);
});

// Create new user.
router.post('/new', async (req, res) => {
    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    if (await User.findOne({ email: req.body.email })) return res.status(400).send('Email is already register.');
    if (await User.findOne({ userName: req.body.userName })) return res.status(400).send('User name is already taken.');

    const user = new User({
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
    res.header('x-auth-token', token).send(user);
});

// Upload user's avatar or replace the old one.
router.put('/uploadavatar', auth, uploadAvatar.single('avatar'), async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(400).send('Invalid user.');
    if (!req.file) return res.status(400).send('No image provided.');

    if (user.profilePhotoId) {
        await cloudinary.v2.api.delete_resources(user.profilePhotoId, (error) => {
            if (error) throw error;
        });
    }
    user.profilePhoto = req.file.url;
    user.profilePhotoId = req.file.public_id;
    await user.save();

    res.send({
        _id: user._id,
        profilePhoto: user.profilePhoto,
    });
});

// Update information of the current logged user.
router.patch('/updateme', auth, async (req, res) => {
    if (!await User.findById(req.userId)) return res.status(400).send('Invalid user.');

    const { error } = validateUserUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    if (await User.findOne({ email: req.body.email })) return res.status(400).send('Email is already taken.');
    if (await User.findOne({ userName: req.body.userName })) return res.status(400).send('Username is already taken.');

    await User.findById(req.userId).exec(async (err, u) => {
        if (err) throw err;
        if (req.body.userName) u.userName = req.body.userName;
        if (req.body.email) u.email = req.body.email;
        if (req.body.DOB) u.DOB = req.body.DOB;
        if (req.body.firstName) u.firstName = req.body.firstName;
        if (req.body.lastName) u.lastName = req.body.lastName;
        if (req.body.password) {
            const salt = await bcrypt.genSalt(8);
            u.password = await bcrypt.hash(req.body.password, salt);
        }
        await u.save();
        res.send({
            _id: u._id,
            userName: u.userName,
            email: u.email,
            DOB: u.DOB,
            firstName: u.firstName,
            lastName: u.lastName,
        });
    });
});

// Follow one certain user.
router.post('/follow/:userid', auth, async (req, res) => {
    if (!validateId(req.userId)) return res.status(400).send('Invalid current user ID.');
    if (!validateId(req.params.userid)) return res.status(400).send('Invalid user ID.');
    if (req.params.userid === req.userId) return res.status(400).send('You cannot follow yourself.');

    const user = await User.findById(req.params.userid);
    if (!user) return res.status(400).send('Invalid user.');

    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(400).send('Invalid user.');

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
        res.send([{
            _id: currentUser._id,
            userName: currentUser.userName,
            numberOfFollowings: currentUser.numberOfFollowings,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
        }, {
            _id: user._id,
            userName: user.userName,
            numberOfFollowers: user.numberOfFollowers,
            firstName: user.firstName,
            lastName: user.lastName,
        }]);
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
        res.send([{
            _id: currentUser._id,
            userName: currentUser.userName,
            numberOfFollowings: currentUser.numberOfFollowings,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
        }, {
            _id: user._id,
            userName: user.userName,
            numberOfFollowers: user.numberOfFollowers,
            firstName: user.firstName,
            lastName: user.lastName,
        }]);
    }
});

// Remove follower from your followers.
router.post('/removefollower/:userid', auth, async (req, res) => {
    if (!validateId(req.userId)) return res.status(400).send('Invalid current user ID.');
    if (!validateId(req.params.userid)) return res.status(400).send('Invalid user ID.');
    if (req.params.userid === req.userId) return res.status(400).send('You cannot do this with yourself.');

    const user = await User.findById(req.params.userid);
    if (!user) return res.status(400).send('Invalid user.');

    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(400).send('Invalid current user.');

    const isFollower = await User.findOne({
        _id: req.userId,
        followers: req.params.userid,
    });

    if (isFollower) {
        async function removeUser(u, userToRemove) {
            u.followers.remove(userToRemove);
            u.numberOfFollowers -= 1;
            await u.save();
        }
        async function removeUserfromFollowings(u, followingUser) {
            u.followings.remove(followingUser);
            u.numberOfFollowings -= 1;
            await u.save();
        }
        await removeUser(currentUser, user);
        await removeUserfromFollowings(user, currentUser);
        res.send([{
            _id: currentUser._id,
            userName: currentUser.userName,
            numberOfFollowings: currentUser.numberOfFollowings,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
        }, {
            _id: user._id,
            userName: user.userName,
            numberOfFollowers: user.numberOfFollowers,
            firstName: user.firstName,
            lastName: user.lastName,
        }]);
    } else {
        res.send('This user does not follow you.');
    }
});

// Get the list of all followers of the certain user.
router.get('/followers/:userid', async (req, res) => {
    if (!validateId(req.params.userid)) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.params.userid)
        .select('followers, numberOfFollowers')
        .populate({
            path: 'followers',
            select: 'firstName lastName profilePhoto userName pinnedTweet numberOfTweets numberOfRetweets numberOfFollowers numberOfFollowings',
        });
    if (!user) return res.status(400).send('Invalid user.');
    res.send(user);
});

// Get the list of all followings of the certain user.
router.get('/followings/:userid', async (req, res) => {
    if (!validateId(req.params.userid)) return res.status(400).send('Invalid user ID.');

    const user = await User.findById(req.params.userid)
        .select('followings, numberOfFollowings')
        .populate({
            path: 'followings',
            select: 'firstName lastName profilePhoto userName pinnedTweet numberOfTweets numberOfRetweets numberOfFollowers numberOfFollowings',
        });
    if (!user) return res.status(400).send('Invalid user.');
    res.send(user);
});

// Delete current logged user (!!Postponed).
/*
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

    const tweets = Tweet.find().populate({
        path: 'tweetComments',
    });
    async function deleteAllCommentsFromTweets(tw, com) {
        await tw.tweetComments.remove(com);
        tw.numberOfComments -= 1;
        await tw.save();
    }
    async function deleteAllLikesFromTweet(l, tw) {
        tw.tweetLikes.remove(l);
        await tw.save();
    }
    deleteAllCommentsFromTweets(tweet, req.body.commentId);
    deleteAllLikesFromTweet(like, tweetObj);

    res.send(user);
});
*/

module.exports = router;
