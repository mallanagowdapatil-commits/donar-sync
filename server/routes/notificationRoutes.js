import express from 'express';
import { getMyNotifications, markAsRead, clearNotifications, getPreferences, updatePreferences, savePushSubscription } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/my', getMyNotifications);
router.patch('/:id/read', markAsRead);
router.delete('/clear', clearNotifications);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);
router.post('/subscribe', savePushSubscription);

export default router;
