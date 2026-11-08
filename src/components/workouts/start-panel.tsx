"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startWorkoutAction } from "@/lib/actions";
import { useAction } from "@/components/use-action";
import { Field } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StartWorkout({
  date,
  planDay,
  activeId,
  lastCompleted,
}: {
  date: string;
  planDay: { id: string; name: string } | null;
  activeId: string | null;
  lastCompleted?: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");

  function start(options?: { planDayId?: string; repeatFromId?: string }) {
    run(async () => {
      const result = await startWorkoutAction({
        date,
        planDayId: options?.planDayId ?? null,
        repeatFromId: options?.repeatFromId ?? null,
        name: name || undefined,
      });
      if (result.ok && "data" in result && result.data?.id) router.push(`/workouts/${result.data.id}`);
      return result;
    });
  }

  if (activeId) {
    return (
      <Button type="button" onClick={() => router.push(`/workouts/${activeId}`)}>
        Resume workout
      </Button>
    );
  }

  return (
    <div className="grid gap-3">
      <Field label="Custom name">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={planDay?.name ?? "Workout"} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-11" variant="outline" disabled={pending} onClick={() => start()}>
          Start empty workout
        </Button>
        {planDay ? (
          <Button type="button" className="h-11" disabled={pending} onClick={() => start({ planDayId: planDay.id })}>
            Start {planDay.name}
          </Button>
        ) : null}
        {lastCompleted ? (
          <Button type="button" className="h-11" variant="secondary" disabled={pending} onClick={() => start({ repeatFromId: lastCompleted.id })}>
            Repeat {lastCompleted.name}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
