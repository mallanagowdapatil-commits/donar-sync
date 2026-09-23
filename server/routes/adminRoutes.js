import express from 'express';
import { getMetrics, getUsers, toggleUserStatus, getAuditLogs } from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['Admin']));

router.get('/metrics', getMetrics);
router.get('/users', getUsers);
router.patch('/users/:id/status', toggleUserStatus);
router.get('/audit', getAuditLogs);

export default router;
