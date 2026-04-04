import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a mock client that won't crash when env vars aren't set
    const mockResult = { data: null, error: null };
    const chainable = (): Record<string, unknown> =>
      new Proxy({} as Record<string, unknown>, {
        get(_target, prop) {
          if (prop === "then") return undefined; // not a Promise
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
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => chainable(),
      rpc: async () => mockResult,
    } as unknown as ReturnType<typeof createBrowserClient<Database>>;
  }

  return createBrowserClient<Database>(url, key);
}
