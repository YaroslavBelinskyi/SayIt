const mongoose = require('mongoose');
const Joi = require('joi');

const tweetCommentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    tweet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tweet',
    },
    commentText: {
        type: String,
        minlength: 1,
        maxlength: 322,
        required: true,
    },
    creationDate: {
        type: Date,
        default: Date.now,
    },
});

const TweetComment = mongoose.model('TweetComment', tweetCommentSchema);

function validateTweetComment(tweetComment) {
    const schema = {
        commentText: Joi.string().min(1).max(322).required(),
    };
    return Joi.validate(tweetComment, schema);
}

module.exports = { TweetComment, validateTweetComment };
