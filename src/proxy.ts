import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const required = process.env.VERCEL === "1" || process.env.FORGE_REQUIRE_AUTH === "true" || Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!required) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !process.env.ALLOWED_EMAIL) {
    return new NextResponse("FORGE is not configured. Set the Supabase URL, anon key, allowed email, and database URL. No records are being served.", {
      status: 503,
    });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  const allowed = process.env.ALLOWED_EMAIL.trim().toLowerCase();
  const path = request.nextUrl.pathname;
  const signingIn = path === "/login";
  if (data.user && email === allowed) return response;
  if (signingIn) return response;
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
