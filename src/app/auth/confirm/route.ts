import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase-env";
import type { EmailOtpType } from "@supabase/supabase-js";

function safePath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabaseUrlValue = supabaseUrl();
  const key = supabasePublishableKey();
  if (!tokenHash || !type || !supabaseUrlValue || !key) {
    return NextResponse.redirect(new URL("/login?error=expired", url.origin));
  }
  const destination = new URL(type === "recovery" ? "/auth/password" : safePath(url.searchParams.get("next")), url.origin);
  const response = NextResponse.redirect(destination);
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
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(new URL("/login?error=expired", url.origin));
  return response;
}
