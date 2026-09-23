import express from 'express';
import { getCampaigns, createCampaign, getOrganizationStats } from '../controllers/organizationController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/campaigns', optionalAuth, getCampaigns);
router.post('/campaigns', authenticateToken, createCampaign);
router.get('/stats', optionalAuth, getOrganizationStats);

export default router;
