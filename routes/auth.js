const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');

const { User } = require('../models/users');

const router = express.Router();

function validate(reqBody) {
    const schema = {
        email: Joi.string().min(5).max(255).email().required(),
        password: Joi.string().min(3).max(255).required(),
    };
    return Joi.validate(reqBody, schema);
}

router.post('/', async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send('Invalid email or password');

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    const token = user.generateAuthToken();
    res.send(token);
});

module.exports = router;
