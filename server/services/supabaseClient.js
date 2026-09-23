import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_project_url') {
  console.warn('⚠️ Supabase credentials not fully configured. Using backend in-memory simulation fallback.');
}

export const supabase = (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_project_url')
  ? createClient(supabaseUrl, supabaseKey)
  : null;
