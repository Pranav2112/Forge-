"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase-env";

export function RecoverySession() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token") && !hash.includes("type=recovery")) return;
    const url = supabaseUrl();
    const key = supabasePublishableKey();
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    void supabase.auth.getSession().then(() => {
      router.replace("/auth/password");
    });
  }, [router]);

  return null;
}
