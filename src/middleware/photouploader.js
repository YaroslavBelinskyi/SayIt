const config = require('config');
const multer = require('multer');
const cloudinary = require('cloudinary');
const cloudinaryStorage = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: config.get('cloudName'),
    api_key: config.get('apiKey'),
    api_secret: config.get('apiSecret'),
});

function storageCreator(name) {
    const storage = cloudinaryStorage({
        cloudinary,
        folder: name,
        allowedFormats: ['jpg', 'png'],
    });
    const upload = multer({ storage });
    return upload;
}

const uploadTweetImages = storageCreator('tweetImages');
const uploadAvatar = storageCreator('profilePhotos');

module.exports = { uploadTweetImages, uploadAvatar };
