import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
          cs.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
            } catch {
              // Server Components cannot write cookies; middleware refreshes them.
            }
          });
        },
      },
    }
  );
};
