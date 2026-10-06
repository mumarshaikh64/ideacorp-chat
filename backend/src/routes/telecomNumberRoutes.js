const express = require('express');
const router = express.Router();
const multer = require('multer');
const TelecomNumberController = require('../controllers/telecomNumberController');
const { authenticateStaff, authorize } = require('../middlewares/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max for large number sheets
});

router.use(authenticateStaff);

// 1. List numbers & search
router.get('/', authorize(['admin', 'agent', 'supervisor', 'viewer']), TelecomNumberController.list);

// 2. Stats & category distribution
router.get('/stats', authorize(['admin', 'agent', 'supervisor', 'viewer']), TelecomNumberController.getStats);

// 3. Sample series / sequence numbers for chat showcase
router.get('/series', authorize(['admin', 'agent', 'supervisor', 'viewer']), TelecomNumberController.getSeries);

// 4. Reserve number for 3 days
router.post('/reserve', authorize(['admin', 'agent', 'supervisor']), TelecomNumberController.reserve);

// 5. Mark number as sold (permanently unavailable)
router.post('/sell', authorize(['admin', 'agent', 'supervisor']), TelecomNumberController.sell);

// 6. Release reserved number back to pool
router.post('/release', authorize(['admin', 'agent', 'supervisor']), TelecomNumberController.release);

// 7. Share series numbers directly into live chat
router.post('/share-to-chat', authorize(['admin', 'agent', 'supervisor']), TelecomNumberController.shareToChat);

// 8. Import from Google Sheet URL
router.post('/import-google-sheet', authorize(['admin', 'agent', 'supervisor']), TelecomNumberController.importGoogleSheet);

// 9. Upload CSV file
router.post('/upload', authorize(['admin', 'agent', 'supervisor']), upload.single('file'), TelecomNumberController.uploadCsv);

// 10. Add single number manually
router.post('/', authorize(['admin', 'agent', 'supervisor']), TelecomNumberController.create);

// 11. Update number status/details
router.patch('/:id', authorize(['admin', 'agent', 'supervisor']), TelecomNumberController.update);

// 12. Delete single number
router.delete('/:id', authorize(['admin', 'supervisor']), TelecomNumberController.delete);

// 13. Clear all numbers
router.post('/clear-all', authorize(['admin']), TelecomNumberController.clearAll);

module.exports = router;
