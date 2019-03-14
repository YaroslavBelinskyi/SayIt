const mongoose = require('mongoose');
const Joi = require('joi');

const tweetSchema = new mongoose.Schema({
    user: {
        type: new mongoose.Schema({
            firstName: {
                type: String,
                required: true,
                minlength: 3,
                maxlength: 60,
            },
            lastName: {
                type: String,
                required: true,
                minlength: 3,
                maxlength: 60,
            },
        }),
        required: true,
    },
    tweetText: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 322,
    },
    // tweetLikes: [schema]
    // comments: [schema]
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
        userId: Joi.string().required(),
        tweetText: Joi.string().min(1).max(322).required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        numberOfLikes: Joi.number(),
        numberOfComments: Joi.number(),
    };
    return Joi.validate(tweet, schema);
}

exports.Tweet = Tweet;
exports.tweetSchema = tweetSchema;
exports.validateTweet = validateTweet;
