"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/bits";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase-env";

export function LoginForm({ expired = false }: { expired?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(expired ? "That password link expired. Sign in, or request a new one from the Supabase dashboard." : "");
  const [pending, setPending] = useState(false);
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  const configured = Boolean(url && key);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setPending(true);
    setMessage("");
    const supabase = createBrowserClient(url, key);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (error) {
      setMessage("Sign-in failed. Check the email and password.");
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
        <Input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </Field>
      <Button type="submit" disabled={pending || password.length < 8}>
        {pending ? "Signing in" : "Sign in"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
