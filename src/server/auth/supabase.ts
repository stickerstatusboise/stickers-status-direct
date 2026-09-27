import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase settings (Project Settings → API). Public by design: they only allow what Supabase Auth allows. */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

/** Supabase client for server components, route handlers and server actions. Create one per request. */
export async function createSupabaseServer() {
  const env = supabaseEnv();
  if (!env) throw new Error("Sign-in isn't set up: add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  const store = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a server component, where cookies are read-only. The proxy refreshes the session instead.
        }
      },
    },
  });
}
