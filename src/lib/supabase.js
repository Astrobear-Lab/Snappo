import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase not configured!\n' +
    'Please create a .env file with:\n' +
    '  VITE_SUPABASE_URL=your-project-url\n' +
    '  VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
    'See .env.example for reference.'
  );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};
