import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

let supabaseInstance = null;
let isConfigured = false;
let isReachable = false;
let lastCheckTime = 0;
let lastCheckError = null;

const isValidUrl = (urlStr) => {
  if (!urlStr || urlStr.includes('your_supabase_') || urlStr.trim() === '') return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const cleanUrl = (urlStr) => {
  if (!urlStr) return '';
  return urlStr.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

const sanitizedUrl = cleanUrl(config.supabaseUrl);
const hasServiceRole = config.supabaseServiceRoleKey && 
  !config.supabaseServiceRoleKey.includes('your_supabase_') && 
  config.supabaseServiceRoleKey.trim() !== '';

const activeKey = hasServiceRole ? config.supabaseServiceRoleKey : config.supabaseAnonKey;

if (isValidUrl(sanitizedUrl) && activeKey && !activeKey.includes('your_supabase')) {
  try {
    supabaseInstance = createClient(sanitizedUrl, activeKey, {
      auth: { persistSession: false },
      global: {
        fetch: (...args) => {
          // Custom fetch with 8-second timeout to allow smooth cloud query resolution
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          return fetch(args[0], { ...args[1], signal: controller.signal })
            .finally(() => clearTimeout(timeoutId));
        }
      }
    });
    isConfigured = true;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err.message);
    isConfigured = false;
  }
}

/**
 * Health check with caching (cached for 10 seconds to avoid flooding DNS)
 */
export async function checkSupabaseHealth() {
  const now = Date.now();
  if (now - lastCheckTime < 10000) {
    return { configured: isConfigured, reachable: isReachable, error: lastCheckError };
  }

  lastCheckTime = now;
  if (!isConfigured || !supabaseInstance) {
    isReachable = false;
    lastCheckError = 'Supabase credentials not configured or placeholder detected';
    return { configured: false, reachable: false, error: lastCheckError };
  }

  try {
    // Quick probe to test connectivity
    const { error } = await supabaseInstance.from('users').select('id').limit(1);
    if (error && error.code !== 'PGRST116' && !error.message?.includes('does not exist')) {
      // If error is network-level
      if (error.message?.includes('fetch failed') || error.message?.includes('ENOTFOUND')) {
        isReachable = false;
        lastCheckError = `Supabase host unreachable: ${error.message}`;
      } else {
        // Table doesn't exist yet or permission denied means host IS reachable!
        isReachable = true;
        lastCheckError = null;
      }
    } else {
      isReachable = true;
      lastCheckError = null;
    }
  } catch (err) {
    isReachable = false;
    lastCheckError = `Supabase network probe failed: ${err.message}`;
  }

  return { configured: isConfigured, reachable: isReachable, error: lastCheckError };
}

export const supabase = supabaseInstance;
export { isConfigured as isSupabaseConfigured };
