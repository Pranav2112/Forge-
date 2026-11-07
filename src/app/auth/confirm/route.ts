import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase-env";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") || "/";
  const destination = new URL(next.startsWith("/") ? next : "/", url.origin);
  const response = NextResponse.redirect(destination);
  const supabaseUrlValue = supabaseUrl();
  const key = supabasePublishableKey();
  if (!tokenHash || !type || !supabaseUrlValue || !key) return response;
  const supabase = createServerClient(supabaseUrlValue, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  return response;
}
