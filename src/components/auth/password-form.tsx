"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/bits";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase-env";

export function PasswordForm({ mode, email }: { mode: "change" | "set"; email?: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const url = supabaseUrl();
  const key = supabasePublishableKey();

  useEffect(() => {
    if (mode !== "set" || !url || !key) return;
    const supabase = createBrowserClient(url, key);
    void supabase.auth.getSession();
  }, [mode, url, key]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!url || !key) return;
    if (next.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setMessage("The two new passwords do not match.");
      return;
    }
    setPending(true);
    setMessage("");
    const supabase = createBrowserClient(url, key);
    if (mode === "change") {
      const { error } = await supabase.auth.signInWithPassword({ email: email ?? "", password: current });
      if (error) {
        setPending(false);
        setMessage("Current password is wrong.");
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setCurrent("");
    setNext("");
    setConfirm("");
    setPending(false);
    if (error) {
      setMessage("Could not update the password. Open a fresh password link if this is the first one.");
      return;
    }
    if (mode === "set") {
      router.push("/");
      router.refresh();
      return;
    }
    setMessage("Password updated.");
  }

  if (!url || !key) return null;

  return (
    <form className="grid max-w-sm gap-3" onSubmit={submit}>
      {mode === "change" ? (
        <Field label="Current password">
          <Input type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} required />
        </Field>
      ) : null}
      <Field label="New password" hint="At least 8 characters. It stays in Supabase Auth and is not saved in FORGE.">
        <Input type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} minLength={8} required />
      </Field>
      <Field label="Confirm new password">
        <Input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={8} required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : mode === "change" ? "Change password" : "Set password"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
