import express from 'express';
import { getStocks, updateStock, addExpiryPacket, updateExpiryPacket, getTransactions } from '../controllers/inventoryController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/stocks', getStocks);
router.post('/update', authenticateToken, requireRole(['Blood Bank', 'Hospital', 'Admin']), updateStock);
router.post('/expiry/add', authenticateToken, requireRole(['Blood Bank', 'Admin']), addExpiryPacket);
router.patch('/expiry/:id', authenticateToken, requireRole(['Blood Bank', 'Admin']), updateExpiryPacket);
router.get('/transactions', authenticateToken, requireRole(['Blood Bank', 'Admin']), getTransactions);

export default router;
