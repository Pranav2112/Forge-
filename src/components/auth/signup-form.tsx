"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/bits";
import { activateOwnerAccount } from "@/lib/owner-activation";
import { signInErrorMessage } from "@/lib/auth-errors";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase-env";

export function SignupForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "");
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    const confirm = String(data.get("confirm") || "");
    const code = String(data.get("code") || "");
    setPending(true);
    setMessage("");
    const result = await activateOwnerAccount({ name, email, password, confirm, code });
    if (!result.ok) {
      setPending(false);
      setMessage(result.message);
      return;
    }
    const url = supabaseUrl();
    const key = supabasePublishableKey();
    const { error } = await createBrowserClient(url, key).auth.signInWithPassword({
      email: result.email,
      password,
    });
    setPending(false);
    if (error) {
      setMessage(`${signInErrorMessage(error.code)} You can use Log in with this password.`);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <Field label="Full name">
        <Input name="name" autoComplete="name" required />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password" hint="At least 8 characters. Supabase stores it, and FORGE does not.">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirm password">
        <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Setup code" hint="The one-time code printed in your terminal. It is not your password.">
        <Input name="code" autoComplete="one-time-code" required />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Creating account" : "Create account"}</Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
