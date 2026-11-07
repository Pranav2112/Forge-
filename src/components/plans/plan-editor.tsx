"use client";

import { useState } from "react";
import { addPlannedExerciseAction, removePlannedExerciseAction, updatePlanDayAction, updatePlannedExerciseAction } from "@/lib/actions";
import { useAction } from "@/components/use-action";
import { Field, NativeSelect } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Day = {
  id: string;
  weekday: string;
  name: string;
  focus: string;
  notes: string;
  exercises: { id: string; name: string; targetSets: number | null; targetReps: string; notes: string }[];
};

export function PlanEditor({ days, exercises }: { days: Day[]; exercises: { id: string; name: string }[] }) {
  return (
    <div className="grid gap-4">
      {days.map((day) => (
        <DayCard key={day.weekday} day={day} exercises={exercises} />
      ))}
    </div>
  );
}

function DayCard({ day, exercises }: { day: Day; exercises: { id: string; name: string }[] }) {
  const { pending, run } = useAction();
  const [name, setName] = useState(day.name);
  const [focus, setFocus] = useState(day.focus);
  const [notes, setNotes] = useState(day.notes);
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8-12");
  if (!day.id) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs tracking-[0.14em] text-primary uppercase">{day.weekday}</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Field label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Focus"><Input value={focus} onChange={(event) => setFocus(event.target.value)} /></Field>
      </div>
      <Textarea className="mt-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <Button className="mt-2" type="button" variant="outline" disabled={pending} onClick={() => run(() => updatePlanDayAction({ id: day.id, name, focus, notes }), "Day updated")}>
        Save day
      </Button>
      <div className="mt-4 grid gap-2">
        {day.exercises.map((exercise) => (
          <PlannedRow key={exercise.id} exercise={exercise} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Field label="Add exercise">
          <NativeSelect className="min-w-52" value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Input className="w-20" value={sets} onChange={(event) => setSets(event.target.value)} aria-label="Target sets" />
        <Input className="w-28" value={reps} onChange={(event) => setReps(event.target.value)} aria-label="Target reps" />
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () =>
                addPlannedExerciseAction({
                  dayId: day.id,
                  exerciseId,
                  targetSets: Number(sets) || null,
                  targetReps: reps,
                  notes: "",
                }),
              "Exercise added",
            )
          }
        >
          Add
        </Button>
      </div>
    </section>
  );
}

function PlannedRow({ exercise }: { exercise: Day["exercises"][number] }) {
  const { pending, run } = useAction();
  const [sets, setSets] = useState(exercise.targetSets ? String(exercise.targetSets) : "");
  const [reps, setReps] = useState(exercise.targetReps);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-40 font-medium">{exercise.name}</span>
      <Input className="w-20" value={sets} onChange={(event) => setSets(event.target.value)} aria-label={`${exercise.name} sets`} />
      <Input className="w-28" value={reps} onChange={(event) => setReps(event.target.value)} aria-label={`${exercise.name} reps`} />
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => updatePlannedExerciseAction({ id: exercise.id, targetSets: Number(sets) || null, targetReps: reps, notes: exercise.notes }), "Targets saved")}>
        Save
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => removePlannedExerciseAction(exercise.id), "Removed from the plan")}>
        Remove
      </Button>
    </div>
  );
}
