"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canEstimate1RM, elapsedWorkoutMs, formatDuration } from "@/lib/calc";
import { MUSCLE_GROUPS, SET_TYPES } from "@/lib/constants";
import { grams } from "@/lib/format";
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
import { Field } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  library: { id: string; name: string; primaryMuscle: string; secondaryMuscles: string; equipment: string; tracksLoad: boolean; exerciseType: string }[];
  weightUnit: string;
  restDefault: number;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [now, setNow] = useState(() => Date.now());
  const [notes, setNotes] = useState(session.notes);
  const [restKick, setRestKick] = useState(0);

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

      <RestTimer defaultSeconds={restDefault} kick={restKick} />

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
        <ExercisePicker
          library={library}
          pending={pending}
          onAdd={(exerciseId) => run(() => addExerciseToWorkoutAction({ sessionId: session.id, exerciseId }), "Exercise added")}
        />
      ) : null}

      <div className="grid gap-4">
        {session.exercises.map((block) => (
          <ExerciseCard key={block.id} block={block} open={session.status !== "completed"} weightUnit={weightUnit} pending={pending} run={run} onLogged={() => setRestKick((value) => value + 1)} />
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
  onLogged,
}: {
  block: ExerciseBlock;
  open: boolean;
  weightUnit: string;
  pending: boolean;
  run: ReturnType<typeof useAction>["run"];
  onLogged: () => void;
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
      {open ? (
        <QuickSet
          block={block}
          tracksLoad={block.exercise.tracksLoad}
          weightUnit={weightUnit === "lb" ? "lb" : "kg"}
          pending={pending}
          run={run}
          onLogged={onLogged}
        />
      ) : null}
    </section>
  );
}

function QuickSet({
  block,
  tracksLoad,
  weightUnit,
  pending,
  run,
  onLogged,
}: {
  block: ExerciseBlock;
  tracksLoad: boolean;
  weightUnit: "kg" | "lb";
  pending: boolean;
  run: ReturnType<typeof useAction>["run"];
  onLogged: () => void;
}) {
  const last = block.sets[block.sets.length - 1];
  const prior = block.previous?.sets[0];
  const [weight, setWeight] = useState(last?.weight != null ? String(last.weight) : prior?.weight != null ? String(prior.weight) : "");
  const [reps, setReps] = useState(last?.reps != null ? String(last.reps) : prior?.reps != null ? String(prior.reps) : "");
  const [duration, setDuration] = useState(last?.durationSeconds != null ? String(last.durationSeconds) : "");
  const [distance, setDistance] = useState(last?.distanceM != null ? String(last.distanceM) : "");
  const [setType, setSetType] = useState("working");
  const [unit, setUnit] = useState<"kg" | "lb">(last?.weightUnit === "lb" ? "lb" : weightUnit);

  function log() {
    run(async () => {
      const result = await addSetAction({
        workoutExerciseId: block.id,
        weight: tracksLoad && weight !== "" ? Number(weight) : null,
        weightUnit: unit,
        reps: reps !== "" ? Number(reps) : null,
        setType,
        rpe: null,
        rir: null,
        durationSeconds: !tracksLoad && duration !== "" ? Number(duration) : null,
        distanceM: !tracksLoad && distance !== "" ? Number(distance) : null,
        notes: "",
      });
      if (result.ok) onLogged();
      return result;
    }, "Set logged");
  }

  return (
    <div className="mt-3 grid gap-2">
      <div className="flex gap-1 overflow-x-auto">
        {SET_TYPES.map((type) => (
          <Button key={type.id} type="button" size="sm" variant={setType === type.id ? "default" : "outline"} onClick={() => setSetType(type.id)}>
            {type.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tracksLoad ? (
          <>
            <Field label={`Weight (${unit})`}>
              <Input inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} aria-label="Weight" />
            </Field>
            <Field label="Reps">
              <Input inputMode="numeric" value={reps} onChange={(event) => setReps(event.target.value)} aria-label="Reps" />
            </Field>
          </>
        ) : (
          <>
            <Field label="Seconds">
              <Input inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} aria-label="Duration seconds" />
            </Field>
            <Field label="Meters">
              <Input inputMode="decimal" value={distance} onChange={(event) => setDistance(event.target.value)} aria-label="Distance meters" />
            </Field>
          </>
        )}
      </div>
      <div className="sticky bottom-20 z-20 flex gap-2 bg-card py-2">
        {tracksLoad ? (
          <Button type="button" variant="outline" className="h-11" onClick={() => setUnit(unit === "kg" ? "lb" : "kg")}>{unit}</Button>
        ) : null}
        <Button type="button" className="h-11 flex-1" disabled={pending} onClick={log}>Log set</Button>
      </div>
    </div>
  );
}

function ExercisePicker({
  library,
  pending,
  onAdd,
}: {
  library: { id: string; name: string; primaryMuscle: string; secondaryMuscles: string; equipment: string }[];
  pending: boolean;
  onAdd: (exerciseId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("All");
  const [equipment, setEquipment] = useState("All");
  const equipmentOptions = ["All", ...Array.from(new Set(library.map((exercise) => exercise.equipment))).sort()];
  const muscles = ["All", ...MUSCLE_GROUPS];
  const needle = query.trim().toLowerCase();
  const results = library.filter((exercise) => {
    const musclesText = `${exercise.primaryMuscle} ${exercise.secondaryMuscles}`.toLowerCase();
    if (muscle !== "All" && !musclesText.includes(muscle.toLowerCase())) return false;
    if (equipment !== "All" && exercise.equipment !== equipment) return false;
    if (!needle) return true;
    return `${exercise.name} ${exercise.equipment} ${musclesText}`.toLowerCase().includes(needle);
  }).slice(0, 40);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button type="button" className="h-11" />}>Add exercise</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <SheetHeader>
          <SheetTitle>Add exercise</SheetTitle>
        </SheetHeader>
        <div className="grid gap-3 px-4 pb-4">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bench, pulldown, squat…" aria-label="Search exercises" />
          <div className="flex gap-1 overflow-x-auto">
            {muscles.map((item) => (
              <Button key={item} type="button" size="sm" variant={muscle === item ? "default" : "outline"} onClick={() => setMuscle(item)}>{item}</Button>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {equipmentOptions.map((item) => (
              <Button key={item} type="button" size="sm" variant={equipment === item ? "default" : "outline"} onClick={() => setEquipment(item)}>{item}</Button>
            ))}
          </div>
          <div className="grid gap-2">
            {results.length === 0 ? <p className="text-sm text-muted-foreground">No exercises match.</p> : results.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                disabled={pending}
                className="flex min-h-11 items-center justify-between rounded-xl border border-border px-3 py-2 text-left text-sm"
                onClick={() => {
                  onAdd(exercise.id);
                  setOpen(false);
                }}
              >
                <span className="font-medium">{exercise.name}</span>
                <span className="text-xs text-muted-foreground">{exercise.primaryMuscle} · {exercise.equipment}</span>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RestTimer({ defaultSeconds, kick }: { defaultSeconds: number; kick: number }) {
  const [chosen, setChosen] = useState(defaultSeconds);
  const [left, setLeft] = useState<number | null>(null);
  const [seenKick, setSeenKick] = useState(kick);
  if (kick !== seenKick) {
    setSeenKick(kick);
    if (kick > 0) setLeft(chosen);
  }

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
