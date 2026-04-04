import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a mock client that won't crash when env vars aren't set
    const chainable = (): Record<string, unknown> =>
      new Proxy({} as Record<string, unknown>, {
        get(_target, prop) {
          if (prop === "then") return undefined;
          if (prop === "data" || prop === "error") return null;
          return chainable;
        },
      });
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOtp: async () => ({ data: null, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => ({ error: null }),
        exchangeCodeForSession: async () => ({ data: null, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => chainable(),
      rpc: async () => ({ data: null, error: null }),
    } as unknown as ReturnType<typeof createServerClient<Database>>;
  }

  const cookieStore = cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method is called from a Server Component where
          // cookies cannot be set. This can be safely ignored when the
          // middleware refreshes the user session.
        }
      },
    },
  });
}
