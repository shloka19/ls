import { createClient } from '@supabase/supabase-js';

export function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be set');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
