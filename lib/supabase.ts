const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const PASSWORD_RESET_REDIRECT_URL =
  process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL ?? 'collegiate://reset-password';

function ensureConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
}

export function getSupabaseConfig() {
  ensureConfig();

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    passwordResetRedirectUrl: PASSWORD_RESET_REDIRECT_URL,
  };
}
