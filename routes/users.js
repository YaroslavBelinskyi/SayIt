const express = require('express');
const bcrypt = require('bcrypt');
// const config = require('config');
// const jwt = require('jsonwebtoken');
// const mongoose = require('mongoose');
const { User, validateUser } = require('../models/users');

const router = express.Router();

router.get('/', async (req, res) => {
    const users = await User.find().sort('userName');
    res.send(users);
});

router.post('/', async (req, res) => {
    console.log(req.body);
    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).send('Email is already register.');

    user = await User.findOne({ userName: req.body.userName });
    if (user) return res.status(400).send('User name is already taken.');

    // let dateOfBirth;
    // if (req.body.DOB) dateOfBirth = new Date(req.body.DOB);
    user = new User({
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
    res.header('x-auth-token', token).send({
        _id: user._id,
        userName: user.userName,
        email: user.email,
    });
});

module.exports = router;
