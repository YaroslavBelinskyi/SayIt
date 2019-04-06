const mongoose = require('mongoose');

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

exports.TweetLike = TweetLike;
