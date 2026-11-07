"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/bits";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase-env";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  const configured = Boolean(url && key);

  function client() {
    return createBrowserClient(url, key);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setPending(true);
    setMessage("");
    const { error } = await client().auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) {
      setMessage("Sign-in failed. Check the email and password, or use the email link.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function sendLink() {
    if (!configured || !email) return;
    setPending(true);
    setMessage("");
    const { error } = await client().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setPending(false);
    setMessage(error ? "Could not send the sign-in email." : "Check your email for the sign-in link.");
  }

  if (!configured) {
    return <p className="text-sm text-muted-foreground">Sign-in is not configured on this copy. Local use stays on this machine only.</p>;
  }

  return (
    <form className="grid max-w-sm gap-3" onSubmit={submit}>
      <Field label="Email">
        <Input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </Field>
      <Field label="Password">
        <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </Field>
      <Button type="submit" disabled={pending || password.length === 0}>{pending ? "Signing in" : "Sign in"}</Button>
      <Button type="button" variant="outline" disabled={pending || email.length === 0} onClick={sendLink}>
        Email me a sign-in link
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
