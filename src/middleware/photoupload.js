const config = require('config');
const multer = require('multer');
const cloudinary = require('cloudinary');
const cloudinaryStorage = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: config.get('cloudName'),
    api_key: config.get('apiKey'),
    api_secret: config.get('apiSecret'),
});
const storage = cloudinaryStorage({
    cloudinary,
    folder: 'profilePhotos',
    allowedFormats: ['jpg', 'png'],
});

const upload = multer({ storage });

module.exports = upload;
