const mongoose = require('mongoose');
const Joi = require('joi');

const tweetLikeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
});

const TweetLike = mongoose.model('TweetLike', tweetLikeSchema);

function validateTweetLike(tweet) {
    const schema = {
        tweetId: Joi.string().required(),
    };
    return Joi.validate(tweet, schema);
}

module.exports = TweetLike;
exports.validateTweetLike = validateTweetLike;
