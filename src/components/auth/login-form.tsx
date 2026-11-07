"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/bits";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setPending(true);
    setMessage("");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    );
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
    <form className="grid max-w-sm gap-3" onSubmit={submit}>
      <Field label="Email">
        <Input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </Field>
      <Field label="Password">
        <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Signing in" : "Sign in"}</Button>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </form>
  );
}
