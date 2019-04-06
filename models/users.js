const mongoose = require('mongoose');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const config = require('config');

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 60,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        minlength: 5,
        maxlength: 255,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 1024,
    },
    DOB: {
        type: Date,
    },
    firstName: {
        type: String,
        minlength: 3,
        maxlength: 60,
    },
    lastName: {
        type: String,
        minlength: 3,
        maxlength: 60,
    },
    tweets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tweet',
    }],
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TweetLike',
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    followings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    numberOfFollowers: {
        type: Number,
        default: 0,
    },
    numberOfFollowings: {
        type: Number,
        default: 0,
    },
});

userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, config.get('jwtPrivateKey'));
    return token;
};

const User = mongoose.model('User', userSchema);

function validateUser(user) {
    const schema = {
        userName: Joi.string().min(3).max(50).required(),
        email: Joi.string().min(5).max(255).email().required(),
        password: Joi.string().min(6).max(255).required(),
        DOB: Joi.date(),
        firstName: Joi.string().min(3).max(50).required(),
        lastName: Joi.string().min(3).max(50).required(),
    };
    return Joi.validate(user, schema);
}

function validateUserUpdate(user) {
    const schema = {
        userName: Joi.string().min(3).max(50),
        email: Joi.string().min(5).max(255).email(),
        password: Joi.string().min(6).max(255),
        DOB: Joi.date(),
        firstName: Joi.string().min(3).max(50),
        lastName: Joi.string().min(3).max(50),
    };
    return Joi.validate(user, schema);
}

function validateId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

exports.User = User;
exports.validateUser = validateUser;
exports.validateUserUpdate = validateUserUpdate;
exports.validateId = validateId;
