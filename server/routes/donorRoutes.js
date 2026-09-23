import express from 'express';
import { registerDonor, getNearbyRequests, toggleAvailability, acceptRequest, getSafetyChecks } from '../controllers/donorController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', optionalAuth, registerDonor);
router.get('/nearby-requests', authenticateToken, getNearbyRequests);
router.patch('/availability', authenticateToken, toggleAvailability);
router.post('/accept', authenticateToken, acceptRequest);
router.post('/requests/:id/respond', authenticateToken, (req, res) => {
  req.body.requestId = req.params.id;
  return acceptRequest(req, res);
});
router.get('/safety-checks', getSafetyChecks);

export default router;
