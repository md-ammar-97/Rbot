import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Disable URL auto-detection so only the explicit exchangeCodeForSession
        // call in /auth/callback runs — prevents the race condition where the
        // auto-exchange consumes the PKCE verifier before our manual call does.
        detectSessionInUrl: false,
      },
    }
  );
