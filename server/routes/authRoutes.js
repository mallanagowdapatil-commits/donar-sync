import express from 'express';
import { register, login, sendPhoneOtp, verifyPhoneOtp, forgotPassword, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/phone/send-otp', sendPhoneOtp);
router.post('/phone/verify-otp', verifyPhoneOtp);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticateToken, getMe);

export default router;
