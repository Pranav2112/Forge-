"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { canEstimate1RM, elapsedWorkoutMs, formatDuration } from "@/lib/calc";
import { SET_TYPES } from "@/lib/constants";
import { grams } from "@/lib/format";
import { setSchema } from "@/lib/validators";
import {
  addExerciseToWorkoutAction,
  addSetAction,
  deleteSetAction,
  deleteWorkoutAction,
  removeWorkoutExerciseAction,
  setWorkoutStatusAction,
  updateWorkoutMetaAction,
} from "@/lib/actions";
import { useAction } from "@/components/use-action";
import { Field, NativeSelect } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SetRow = {
  id: string;
  setNumber: number;
  weight: number | null;
  weightUnit: string;
  reps: number | null;
  rpe: number | null;
  setType: string;
  durationSeconds: number | null;
  distanceM: number | null;
  notes: string;
  volumeKg: number;
  estimateKg: number | null;
};

type ExerciseBlock = {
  id: string;
  notes: string;
  exercise: {
    id: string;
    name: string;
    primaryMuscle: string;
    equipment: string;
    exerciseType: string;
    tracksLoad: boolean;
    instructions: string;
  };
  previous: {
    date: string;
    sets: { weight: number | null; weightUnit: string; reps: number | null; setType: string }[];
    bestWeightKg: number | null;
    bestReps: number | null;
    bestEstimateKg: number | null;
  } | null;
  sets: SetRow[];
};

export function SessionView({
  session,
  library,
  weightUnit,
  restDefault,
}: {
  session: {
    id: string;
    date: string;
    name: string;
    status: string;
    notes: string;
    startedAt: string;
    finishedAt: string | null;
    pausedAt: string | null;
    accumulatedPauseMs: number;
    exercises: ExerciseBlock[];
  };
  library: { id: string; name: string; primaryMuscle: string; tracksLoad: boolean; exerciseType: string }[];
  weightUnit: string;
  restDefault: number;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [now, setNow] = useState(() => Date.now());
  const [notes, setNotes] = useState(session.notes);
  const [exerciseId, setExerciseId] = useState(library[0]?.id ?? "");

  useEffect(() => {
    if (session.status === "completed") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session.status]);

  const elapsed = elapsedWorkoutMs({
    startedAt: new Date(session.startedAt).getTime(),
    finishedAt: session.finishedAt ? new Date(session.finishedAt).getTime() : null,
    pausedAt: session.pausedAt ? new Date(session.pausedAt).getTime() : null,
    accumulatedPauseMs: session.accumulatedPauseMs,
    status: session.status,
    now,
  });
  const volume = session.exercises.reduce((sum, exercise) => sum + exercise.sets.reduce((inner, set) => inner + set.volumeKg, 0), 0);
  const setCount = session.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.16em] text-primary uppercase">{session.status}</p>
          <h1 className="text-3xl font-semibold tabular-nums">{formatDuration(Math.round(elapsed / 1000))}</h1>
          <p className="text-sm text-muted-foreground">{session.date} · {setCount} {setCount === 1 ? "set" : "sets"} · {Math.round(volume)} kg volume</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {session.status === "active" ? (
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => setWorkoutStatusAction({ id: session.id, action: "pause" }))}>Pause</Button>
          ) : null}
          {session.status === "paused" ? (
            <Button type="button" disabled={pending} onClick={() => run(() => setWorkoutStatusAction({ id: session.id, action: "resume" }))}>Resume</Button>
          ) : null}
          {session.status !== "completed" ? (
            <Button type="button" disabled={pending} onClick={() => run(() => setWorkoutStatusAction({ id: session.id, action: "finish", notes }), "Workout saved")}>Finish workout</Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Delete this workout and its sets?")) return;
              run(async () => {
                const result = await deleteWorkoutAction(session.id);
                if (result.ok) router.push("/workouts");
                return result;
              });
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <RestTimer defaultSeconds={restDefault} />

      <div className="grid gap-2">
        <Field label="Workout name">
          <Input defaultValue={session.name} onBlur={(event) => run(() => updateWorkoutMetaAction({ id: session.id, name: event.target.value }))} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <Button type="button" variant="outline" className="w-fit" disabled={pending} onClick={() => run(() => updateWorkoutMetaAction({ id: session.id, notes }), "Notes saved")}>
          Save notes
        </Button>
      </div>

      {session.status !== "completed" ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Add exercise">
            <NativeSelect className="min-w-56" value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>
              {library.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
              ))}
            </NativeSelect>
          </Field>
          <Button type="button" variant="secondary" disabled={pending || !exerciseId} onClick={() => run(() => addExerciseToWorkoutAction({ sessionId: session.id, exerciseId }), "Exercise added")}>
            Add
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4">
        {session.exercises.map((block) => (
          <ExerciseCard key={block.id} block={block} open={session.status !== "completed"} weightUnit={weightUnit} pending={pending} run={run} />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({
  block,
  open,
  weightUnit,
  pending,
  run,
}: {
  block: ExerciseBlock;
  open: boolean;
  weightUnit: string;
  pending: boolean;
  run: ReturnType<typeof useAction>["run"];
}) {
  const showEstimate = canEstimate1RM(block.exercise);
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{block.exercise.name}</h2>
          <p className="text-sm text-muted-foreground">{block.exercise.primaryMuscle} · {block.exercise.equipment}</p>
          {block.exercise.instructions ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{block.exercise.instructions}</p> : null}
        </div>
        {open ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => run(() => removeWorkoutExerciseAction(block.id), "Exercise removed")}>
            Remove
          </Button>
        ) : null}
      </div>
      {block.previous ? (
        <div className="mt-3 rounded-xl bg-muted/70 p-3 text-sm">
          <p className="font-medium">Previous session · {block.previous.date || "earlier"}</p>
          <p className="text-muted-foreground">
            {block.previous.sets.map((set) => `${set.weight ?? "—"} ${set.weightUnit} × ${set.reps ?? "—"}`).join(" · ") || "No sets stored"}
          </p>
          <p className="mt-1 text-muted-foreground">
            {block.previous.bestWeightKg ? `Best weight ${grams(block.previous.bestWeightKg)} kg` : "No working weight yet"}
            {block.previous.bestReps ? ` · most reps ${block.previous.bestReps}` : ""}
            {showEstimate && block.previous.bestEstimateKg ? ` · best estimated 1RM ${grams(block.previous.bestEstimateKg)} kg (Epley)` : ""}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No earlier completed session for this exercise.</p>
      )}
      <div className="mt-3 grid gap-2">
        {block.sets.map((set) => (
          <div key={set.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
            <span>
              Set {set.setNumber} · {SET_TYPES.find((type) => type.id === set.setType)?.label ?? set.setType}
              {set.weight != null ? ` · ${set.weight} ${set.weightUnit}` : ""}
              {set.reps != null ? ` × ${set.reps}` : ""}
              {set.durationSeconds ? ` · ${formatDuration(set.durationSeconds)}` : ""}
              {set.distanceM ? ` · ${set.distanceM} m` : ""}
              {set.rpe != null ? ` · RPE ${set.rpe}` : ""}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {set.estimateKg ? <Badge variant="secondary">Est. 1RM {grams(set.estimateKg)} kg</Badge> : null}
              {open ? (
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteSetAction(set.id), "Set deleted")}>
                  Delete
                </Button>
              ) : null}
            </span>
          </div>
        ))}
      </div>
      {open && block.sets.length > 0 ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          disabled={pending}
          onClick={() => {
            const last = block.sets[block.sets.length - 1];
            run(
              () =>
                addSetAction({
                  workoutExerciseId: block.id,
                  weight: last.weight,
                  weightUnit: last.weightUnit === "lb" ? "lb" : "kg",
                  reps: last.reps,
                  setType: last.setType === "warmup" || last.setType === "drop" || last.setType === "failure" || last.setType === "pr" ? last.setType : "working",
                  rpe: last.rpe,
                  rir: null,
                  durationSeconds: last.durationSeconds,
                  distanceM: last.distanceM,
                  notes: "",
                }),
              "Set repeated",
            );
          }}
        >
          Repeat last set
        </Button>
      ) : null}
      {open ? <SetForm workoutExerciseId={block.id} tracksLoad={block.exercise.tracksLoad} weightUnit={weightUnit === "lb" ? "lb" : "kg"} /> : null}
    </section>
  );
}

function SetForm({ workoutExerciseId, tracksLoad, weightUnit }: { workoutExerciseId: string; tracksLoad: boolean; weightUnit: "kg" | "lb" }) {
  const { pending, run } = useAction();
  const form = useForm({
    resolver: zodResolver(setSchema),
    defaultValues: {
      workoutExerciseId,
      weight: undefined as number | undefined,
      weightUnit,
      reps: undefined as number | undefined,
      rpe: undefined as number | undefined,
      rir: undefined as number | undefined,
      setType: "working" as const,
      durationSeconds: undefined as number | undefined,
      distanceM: undefined as number | undefined,
      notes: "",
    },
  });

  return (
    <form
      className="mt-3 grid gap-2 md:grid-cols-4"
      onSubmit={form.handleSubmit((values) => {
        run(async () => {
          const result = await addSetAction({
            ...values,
            weight: Number.isFinite(values.weight) ? values.weight : null,
            reps: Number.isFinite(values.reps) ? values.reps : null,
            rpe: Number.isFinite(values.rpe) ? values.rpe : null,
            rir: Number.isFinite(values.rir) ? values.rir : null,
            durationSeconds: Number.isFinite(values.durationSeconds) ? values.durationSeconds : null,
            distanceM: Number.isFinite(values.distanceM) ? values.distanceM : null,
          });
          if (result.ok && "data" in result && result.data?.estimatedPr) {
            return { ok: true };
          }
          return result;
        }, "Set logged");
        form.reset({ ...form.getValues(), weight: undefined, reps: undefined, notes: "" });
      })}
    >
      <input type="hidden" {...form.register("workoutExerciseId")} />
      <Field label="Type">
        <NativeSelect {...form.register("setType")}>
          {SET_TYPES.map((type) => (
            <option key={type.id} value={type.id}>{type.label}</option>
          ))}
        </NativeSelect>
      </Field>
      {tracksLoad ? (
        <>
          <Field label="Weight">
            <Input type="number" step="any" {...form.register("weight", { setValueAs: emptyNumber })} />
          </Field>
          <Field label="Unit">
            <NativeSelect {...form.register("weightUnit")}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </NativeSelect>
          </Field>
          <Field label="Reps">
            <Input type="number" {...form.register("reps", { setValueAs: emptyNumber })} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Duration (sec)">
            <Input type="number" {...form.register("durationSeconds", { setValueAs: emptyNumber })} />
          </Field>
          <Field label="Distance (m)">
            <Input type="number" step="any" {...form.register("distanceM", { setValueAs: emptyNumber })} />
          </Field>
          <Field label="Reps">
            <Input type="number" {...form.register("reps", { setValueAs: emptyNumber })} />
          </Field>
        </>
      )}
      <Field label="RPE">
        <Input type="number" step="0.5" {...form.register("rpe", { setValueAs: emptyNumber })} />
      </Field>
      <Field label="RIR">
        <Input type="number" step="0.5" {...form.register("rir", { setValueAs: emptyNumber })} />
      </Field>
      <div className="md:col-span-4">
        <Button type="submit" disabled={pending}>Log set</Button>
        {!tracksLoad ? <p className="mt-2 text-xs text-muted-foreground">Estimated 1RM is not calculated for this exercise.</p> : (
          <p className="mt-2 text-xs text-muted-foreground">Estimated 1RM uses Epley and only for 1–12 reps. It is not a tested max.</p>
        )}
      </div>
    </form>
  );
}

function emptyNumber(value: unknown) {
  if (value === "" || value == null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function RestTimer({ defaultSeconds }: { defaultSeconds: number }) {
  const [chosen, setChosen] = useState(defaultSeconds);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (left == null) return;
    const timer = window.setTimeout(() => {
      if (left <= 1) {
        beep();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Rest complete", { body: "Time for the next set." });
        }
        setLeft(null);
        return;
      }
      setLeft(left - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [left]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border p-3">
      <p className="mr-2 text-sm font-medium">Rest</p>
      {[30, 60, 90, 120].map((seconds) => (
        <Button key={seconds} type="button" size="sm" variant={chosen === seconds ? "default" : "outline"} onClick={() => setChosen(seconds)}>
          {seconds}s
        </Button>
      ))}
      <Input className="w-24" type="number" min={10} value={chosen} onChange={(event) => setChosen(Number(event.target.value) || 30)} aria-label="Custom rest seconds" />
      <Button type="button" variant="secondary" onClick={() => setLeft(chosen)}>Start {formatDuration(chosen)}</Button>
      {left != null ? <span className="text-lg font-semibold tabular-nums">{formatDuration(left)}</span> : null}
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
        }}
      >
        Enable alerts
      </Button>
    </div>
  );
}

function beep() {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.value = 0.05;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.2);
}
