const env = require('../config/env');

class UploadController {
  static async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileUrl = `${env.API_BASE_URL}/uploads/${req.file.filename}`;
      const isImage = req.file.mimetype.startsWith('image/');

      return res.status(201).json({
        message: 'File uploaded successfully',
        file: {
          originalName: req.file.originalname,
          fileName: req.file.filename,
          url: fileUrl,
          mimeType: req.file.mimetype,
          size: req.file.size,
          isImage
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UploadController;
