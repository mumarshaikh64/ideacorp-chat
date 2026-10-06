const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');
const { authenticateStaff, authorize } = require('../middlewares/auth');

router.use(authenticateStaff);

// List past campaigns
router.get('/', authorize(['admin', 'agent', 'supervisor', 'viewer']), CampaignController.listCampaigns);

// Campaign details
router.get('/:id', authorize(['admin', 'agent', 'supervisor', 'viewer']), CampaignController.getCampaignDetails);

// Launch bulk campaign
router.post('/bulk', authorize(['admin', 'agent', 'supervisor']), CampaignController.createBulkCampaign);

module.exports = router;
