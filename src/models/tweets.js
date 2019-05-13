const mongoose = require('mongoose');
const Joi = require('joi');

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
    retweets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Retweet',
    }],
    numberOfLikes: {
        default: 0,
        type: Number,
    },
    numberOfComments: {
        default: 0,
        type: Number,
    },
    numberOfRetweets: {
        default: 0,
        type: Number,
    },
    creationDate: {
        type: Date,
        default: Date.now,
    },
    isPinned: {
        type: Boolean,
        default: false,
    },
    images: {
        type: Array,
    },
    imagesIds: {
        type: Array,
    },
    tags: {
        type: Array,
    },
});

const Tweet = mongoose.model('Tweet', tweetSchema);

function validateTweet(tweet) {
    const schema = {
        tweetText: Joi.string().min(1).max(322).required(),
        tags: Joi.string().max(1000),
    };
    return Joi.validate(tweet, schema);
}

module.exports = { Tweet, validateTweet };
