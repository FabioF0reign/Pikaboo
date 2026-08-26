import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client that reads/writes the visitor's own auth cookies.
// Use this in Server Components, Route Handlers, and middleware for
// anything that should respect Row Level Security as the signed-in admin.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // Called from a Server Component render — middleware refreshes
            // the session instead, so this can be safely ignored.
          }
        },
      },
    }
  );
}
