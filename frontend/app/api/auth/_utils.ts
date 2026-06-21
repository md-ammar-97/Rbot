import { createClient } from "@supabase/supabase-js";

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AuthConfigurationError(`${name} is not configured`);
  }

  return value;
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getSupabaseAuthClients() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_KEY");
  const clientOptions = {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  };

  return {
    supabaseAnon: createClient(supabaseUrl, anonKey, clientOptions),
    supabaseAdmin: createClient(supabaseUrl, serviceKey, clientOptions),
  };
}

export function getOtpEmailConfig() {
  return {
    resendApiKey: requireEnv("RESEND_API_KEY"),
    fromEmail: requireEnv("OTP_FROM_EMAIL"),
  };
}

export function redactAuthError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
