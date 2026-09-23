import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { config, isProduction, isDemoMode } from './config/env.js';
import { checkSupabaseHealth } from './database/supabase.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route modules
import authRoutes from './routes/authRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import matchingRoutes from './routes/matchingRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import { handleChatbotMessage } from './controllers/chatbotController.js';

const app = express();

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow map assets and dynamic resources
}));
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());

// API Rate Limiting to prevent denial of service (DoS) attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes', code: 'RATE_LIMIT_EXCEEDED' }
});
app.use('/api/', apiLimiter);

// -------------------------------------------------------------
// MODULAR API ROUTE MOUNTING
// -------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/health', healthRoutes);

// Context-aware AI clinical assistant route
app.post('/api/chatbot', handleChatbotMessage);

// Root health probe
app.get('/api', (req, res) => {
  res.json({
    name: 'DonorSync Clinical API',
    version: '2.0.0',
    status: 'ONLINE',
    appMode: config.appMode,
    timestamp: new Date().toISOString()
  });
});

// Centralized error handling middleware
app.use(errorHandler);

// Start server
app.listen(config.port, async () => {
  console.log(`========================================================`);
  console.log(`🚀 DonorSync Clinical API Gateway initialized`);
  console.log(`📡 Port: ${config.port}`);
  console.log(`⚙️  Mode: ${config.appMode.toUpperCase()}`);
  
  const dbHealth = await checkSupabaseHealth();
  if (dbHealth.reachable) {
    console.log(`✅ Supabase PostgreSQL: CONNECTED`);
  } else {
    if (isProduction) {
      console.warn(`🚨 WARNING (PRODUCTION): Supabase database is unreachable!`);
      console.warn(`   Error: ${dbHealth.error}`);
    } else {
      console.log(`ℹ️  Supabase host offline. Active Mode: STATEFUL DEMO REPOSITORY`);
      console.log(`   (Full features active for development, matching, testing & presentation)`);
    }
  }
  console.log(`========================================================`);
});

export default app;
