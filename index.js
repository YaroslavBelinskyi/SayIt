const express = require('express');
const config = require('config');
const mongoose = require('mongoose');
const users = require('./routes/users');
const auth = require('./routes/auth');
const tweets = require('./routes/tweets');
const tweetLikes = require('./routes/tweetlikes');
const tweetComments = require('./routes/tweetcomments');

const app = express();

require('./startup/prod')(app);

const PORT = process.env.PORT || 3000;
if (!config.get('jwtPrivateKey')) {
    console.error('FATAL ERROR: jwtPrivateKey is not defined.');
    process.exit(1);
}

const db = config.get('db');
mongoose.connect(db)
    .then(() => console.log('Connected to MongoDB...'))
    .catch(() => console.log('Could not connect to MongoDB...'));


app.use(express.json());
app.use('/api/users', users);
app.use('/api/auth', auth);
app.use('/api/tweets', tweets);
app.use('/api/tweetlikes', tweetLikes);
app.use('/api/tweetcomments', tweetComments);

app.listen(PORT, () => console.log(`Listening to the port ${PORT}`));
