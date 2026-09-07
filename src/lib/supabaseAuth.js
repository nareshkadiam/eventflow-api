import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Supabase Auth proxies — signUp / signInWithPassword are forwarded to
 * Supabase's auth API (client-side anon key) so we never handle passwords.
 */
export function authClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false,	autoRefreshToken: false },
  });
}

/**
 * Service-role client for admin operations (user invites, role switches).
 * Never expose SUPABASE_SERVICE_ROLE_KEY to clients.
 */
export function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key, {
    auth: { persistSession: false,	autoRefreshToken: false },
  });
}

export { serviceClient as adminClient };