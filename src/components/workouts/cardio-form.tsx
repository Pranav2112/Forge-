"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { runningEstimateKcal, toKm } from "@/lib/calc";
import { CARDIO_ACTIVITIES } from "@/lib/constants";
import { deleteCardioAction, logCardioAction } from "@/lib/actions";
import { cardioSchema } from "@/lib/validators";
import { useAction } from "@/components/use-action";
import { Field, NativeSelect } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CardioForm({
  date,
  distanceUnit,
  weightKg,
}: {
  date: string;
  distanceUnit: string;
  weightKg: number | null;
}) {
  const { pending, run } = useAction();
  const form = useForm({
    resolver: zodResolver(cardioSchema),
    defaultValues: {
      date,
      activity: "outdoor_run" as const,
      distanceKm: undefined as number | undefined,
      durationSeconds: 0,
      incline: undefined as number | undefined,
      avgHeartRate: undefined as number | undefined,
      caloriesBurned: undefined as number | undefined,
      caloriesAreEstimate: false,
      notes: "",
    },
  });

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={form.handleSubmit((values) => {
        const distanceInput = Number(values.distanceKm);
        const distanceKm = Number.isFinite(distanceInput) ? toKm(distanceInput, distanceUnit) : null;
        let calories = Number.isFinite(values.caloriesBurned) ? values.caloriesBurned : null;
        const estimate = values.caloriesAreEstimate;
        if (estimate && weightKg && distanceKm) {
          calories = runningEstimateKcal(weightKg, distanceKm);
        }
        run(
          () =>
            logCardioAction({
              ...values,
              distanceKm,
              durationSeconds: Number(values.durationSeconds),
              incline: Number.isFinite(values.incline) ? values.incline : null,
              avgHeartRate: Number.isFinite(values.avgHeartRate) ? values.avgHeartRate : null,
              caloriesBurned: calories,
              caloriesAreEstimate: estimate && calories != null,
            }),
          "Cardio logged",
        );
      })}
    >
      <Field label="Activity">
        <NativeSelect {...form.register("activity")}>
          {CARDIO_ACTIVITIES.map((activity) => (
            <option key={activity.id} value={activity.id}>{activity.label}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Date">
        <Input type="date" {...form.register("date")} />
      </Field>
      <Field label={`Distance (${distanceUnit})`}>
        <Input type="number" step="any" {...form.register("distanceKm", { setValueAs: numOrUndef })} />
      </Field>
      <Field label="Duration (seconds)">
        <Input type="number" {...form.register("durationSeconds", { valueAsNumber: true })} required />
      </Field>
      <Field label="Incline %">
        <Input type="number" step="0.5" {...form.register("incline", { setValueAs: numOrUndef })} />
      </Field>
      <Field label="Average heart rate">
        <Input type="number" {...form.register("avgHeartRate", { setValueAs: numOrUndef })} />
      </Field>
      <Field label="Calories" hint="Leave blank unless you have a number. The checkbox uses a rough running estimate from body weight and distance, labeled as an estimate.">
        <Input type="number" {...form.register("caloriesBurned", { setValueAs: numOrUndef })} />
      </Field>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" {...form.register("caloriesAreEstimate")} />
        Fill calories with a labeled running estimate
      </label>
      <div className="md:col-span-2">
        <Textarea placeholder="Notes" {...form.register("notes")} />
      </div>
      <Button type="submit" disabled={pending}>Log cardio</Button>
    </form>
  );
}

function numOrUndef(value: unknown) {
  if (value === "" || value == null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function DeleteCardio({ id }: { id: string }) {
  const { pending, run } = useAction();
  return (
    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteCardioAction(id), "Cardio deleted")}>
      Delete
    </Button>
  );
}
