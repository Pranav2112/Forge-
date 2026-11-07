import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function authRequired() {
  return process.env.VERCEL === "1" || process.env.FORGE_REQUIRE_AUTH === "true" || Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function allowedEmail(email: string | null | undefined) {
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!allowed) return false;
  return email?.trim().toLowerCase() === allowed;
}

export async function currentUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. Middleware refreshes the session.
        }
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user || !allowedEmail(data.user.email)) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
  } catch {
    return null;
  }
}
