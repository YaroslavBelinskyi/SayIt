const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const tweetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    tweetText: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 322,
    },
    tweetLikes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TweetLike',
    }],
    tweetComments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TweetComment',
    }],
    numberOfLikes: {
        default: 0,
        type: Number,
    },
    numberOfComments: {
        default: 0,
        type: Number,
    },
    creationDate: {
        type: Date,
        default: Date.now,
    },
});

const Tweet = mongoose.model('Tweet', tweetSchema);

function validateTweet(tweet) {
    const schema = {
        tweetText: Joi.string().min(1).max(322).required(),
        listOfLikes: Joi.array(),
    };
    return Joi.validate(tweet, schema);
}

function validateTweetEditing(tweet) {
    const schema = {
        newTweetText: Joi.string().min(1).max(322).required(),
    };
    return Joi.validate(tweet, schema);
}

exports.Tweet = Tweet;
exports.tweetSchema = tweetSchema;
exports.validateTweet = validateTweet;
exports.validateTweetEditing = validateTweetEditing;
