import express from 'express';
import { getSystemHealth } from '../services/systemHealthService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const health = await getSystemHealth();
  const statusCode = health.status === 'HEALTHY' ? 200 : 503;
  return res.status(statusCode).json(health);
});

export default router;
