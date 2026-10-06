/**
 * Centralized error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('[Unhandled Error]', err);

  // Multer upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds maximum allowed limit' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  // Custom client validation error
  if (err.message && err.message.includes('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isPublic ? err.message : (statusCode === 500 ? 'Internal Server Error' : err.message);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;
