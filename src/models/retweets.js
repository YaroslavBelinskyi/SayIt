const mongoose = require('mongoose');
const Joi = require('joi');

const retweetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    tweet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tweet',
    },
    retweetText: {
        type: String,
        minlength: 1,
        maxlength: 322,
    },
    creationDate: {
        type: Date,
        default: Date.now,
    },
    isRetweet: {
        type: Boolean,
        default: true,
    },
});

const Retweet = mongoose.model('Retweet', retweetSchema);

function validateRetweet(retweet) {
    const schema = {
        retweetText: Joi.string().min(1).max(322),
    };
    return Joi.validate(retweet, schema);
}

module.exports = { Retweet, validateRetweet };
