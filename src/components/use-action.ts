"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type Result = { ok: boolean; error?: string };

export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(task: () => Promise<Result>, success?: string) {
    setError(null);
    start(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.error ?? "Could not save that.");
        toast.error(result.error ?? "Could not save that.");
        return;
      }
      if (success) toast.success(success);
      router.refresh();
    });
  }

  return { pending, error, setError, run };
}
