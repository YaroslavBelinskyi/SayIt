const mongoose = require('mongoose');
const Joi = require('joi');

const tweetLikeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    tweet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tweet',
    },
});

const TweetLike = mongoose.model('TweetLike', tweetLikeSchema);

function validateTweetLike(tweetlike) {
    const schema = {
        userId: Joi.string().required(),
    };
    return Joi.validate(tweetlike, schema);
}

exports.TweetLike = TweetLike;
exports.validateTweetLike = validateTweetLike;
