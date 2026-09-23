import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from server root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'donorsync-super-secure-production-jwt-secret-key-2026',
  appMode: process.env.APP_MODE || 'development', // 'production' | 'development' | 'demo'
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

export const isProduction = config.appMode === 'production';
export const isDemoMode = config.appMode === 'demo' || config.appMode === 'development';
