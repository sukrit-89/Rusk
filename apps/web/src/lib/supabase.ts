import { AuthError, createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    });
  }

  return browserClient;
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function readableAuthError(error: AuthError | null) {
  if (!error) return "";
  if (error.message.toLowerCase().includes("invalid login credentials")) {
    return "Invalid email or password. Use Sign up first if this account does not exist.";
  }
  if (error.message.toLowerCase().includes("email not confirmed")) {
    return "Email confirmation is required for this Supabase project. Check your inbox, then sign in.";
  }
  return error.message;
}
