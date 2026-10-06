const express = require('express');
const router = express.Router();
const UploadController = require('../controllers/uploadController');
const upload = require('../middlewares/upload');

// Can be called by authenticated agents or customer chat clients with attachment
router.post('/', upload.single('file'), UploadController.uploadFile);

module.exports = router;
