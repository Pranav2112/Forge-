"use client";

import { useState } from "react";
import { toCm, toKg } from "@/lib/calc";
import { addStepsAction, logWaterAction, logWeightAction, setStepsAction } from "@/lib/actions";
import { useAction } from "@/components/use-action";
import { Field } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WeightLog({ date, unit, previous }: { date: string; unit: string; previous?: string }) {
  const { pending, error, run } = useAction();
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <form
      id="log-weight"
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = Number(weight);
        if (!Number.isFinite(value) || value <= 0) return;
        run(() => logWeightAction({ date, weightKg: toKg(value, unit), notes, representative: true }), "Weight logged");
      }}
    >
      <Field label={`Morning weight (${unit})`} hint={previous ? `Previous weigh-in ${previous}. Logging for ${date}.` : `Logging for ${date}. This becomes the day's representative weigh-in.`}>
        <Input inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} required />
      </Field>
      <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>Log weight</Button>
    </form>
  );
}

export function WaterLog({ date }: { date: string }) {
  const { pending, run } = useAction();
  const [custom, setCustom] = useState("250");
  return (
    <div id="log-water" className="flex flex-wrap gap-2">
      {[250, 500, 750].map((amount) => (
        <Button key={amount} type="button" variant="outline" disabled={pending} onClick={() => run(() => logWaterAction({ date, amountMl: amount }), `${amount} ml logged`)}>
          +{amount} ml
        </Button>
      ))}
      <Input className="w-28" inputMode="numeric" value={custom} onChange={(event) => setCustom(event.target.value)} aria-label="Custom water milliliters" />
      <Button type="button" disabled={pending} onClick={() => run(() => logWaterAction({ date, amountMl: Number(custom) }), "Water logged")}>
        Add
      </Button>
    </div>
  );
}

export function StepsLog({ date, current }: { date: string; current: number }) {
  const { pending, run } = useAction();
  const [total, setTotal] = useState(current ? String(current) : "");
  return (
    <form
      id="log-steps"
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => setStepsAction({ date, steps: Number(total) }), "Steps saved");
      }}
    >
      <Field label="Steps today">
        <Input inputMode="numeric" value={total} onChange={(event) => setTotal(event.target.value)} className="w-36" />
      </Field>
      <Button type="submit" disabled={pending}>Set total</Button>
      <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => addStepsAction({ date, steps: 1000 }), "1,000 steps added")}>
        +1,000
      </Button>
    </form>
  );
}

export function MeasurementHint({ unit }: { unit: string }) {
  return <p className="text-xs text-muted-foreground">Measurements on the body page are stored in centimeters. You are entering {unit === "in" ? "inches" : "centimeters"}.</p>;
}

export function lengthToCm(value: number, unit: string) {
  return toCm(value, unit);
}
