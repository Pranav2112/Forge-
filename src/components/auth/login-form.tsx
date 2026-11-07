"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/bits";
import { signInErrorMessage } from "@/lib/auth-errors";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase-env";

export function LoginForm({ expired = false }: { expired?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState(expired ? "That link expired. Sign in with your password." : "");
  const [pending, setPending] = useState(false);
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  const configured = Boolean(url && key);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    setPending(true);
    setMessage("");
    const supabase = createBrowserClient(url, key);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) {
      setMessage(signInErrorMessage(error.code));
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (!configured) {
    return <p className="text-sm text-muted-foreground">Sign-in is not configured on this copy. Local use stays on this machine only.</p>;
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" minLength={8} required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in" : "Sign in"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
