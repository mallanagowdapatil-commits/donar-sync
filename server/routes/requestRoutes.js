import express from 'express';
import { createEmergencyRequest, getAllRequests, getMyRequests, updateRequestStatus, getRequestDetails } from '../controllers/requestController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/emergency', authenticateToken, requireRole(['Hospital', 'Receiver', 'Admin']), createEmergencyRequest);
router.get('/list', getAllRequests);
router.get('/my-requests', authenticateToken, getMyRequests);
router.get('/:id', getRequestDetails);
router.patch('/:id/status', authenticateToken, updateRequestStatus);

export default router;
