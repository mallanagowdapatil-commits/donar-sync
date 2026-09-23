import { checkSupabaseHealth } from '../database/supabase.js';
import { config, isProduction } from '../config/env.js';

export async function getSystemHealth() {
  const uptimeSeconds = Math.floor(process.uptime());
  const memoryUsage = process.memoryUsage();

  const dbHealth = await checkSupabaseHealth();

  return {
    timestamp: new Date().toISOString(),
    status: dbHealth.reachable || !isProduction ? 'HEALTHY' : 'DEGRADED',
    appMode: config.appMode,
    server: {
      status: 'UP',
      uptimeSeconds,
      uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      memoryRssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
      memoryHeapMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
      nodeVersion: process.version,
      port: config.port
    },
    database: {
      provider: 'Supabase PostgreSQL',
      configured: dbHealth.configured,
      reachable: dbHealth.reachable,
      error: dbHealth.error,
      mode: dbHealth.reachable ? 'CONNECTED_SUPABASE' : (isProduction ? 'UNREACHABLE_PRODUCTION_ERROR' : 'DEMO_FALLBACK_STORE')
    },
    security: {
      jwtConfigured: Boolean(config.jwtSecret && config.jwtSecret !== 'default'),
      corsPolicy: config.corsOrigin,
      rateLimiterActive: true
    },
    notifications: {
      inAppActive: true,
      webPushSupport: true,
      pushConfigured: false // Set to true if VAPID keys provided
    }
  };
}
