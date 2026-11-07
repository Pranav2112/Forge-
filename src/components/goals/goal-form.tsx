"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { deleteGoalAction, saveGoalAction } from "@/lib/actions";
import { goalSchema } from "@/lib/validators";
import { useAction } from "@/components/use-action";
import { Field, NativeSelect } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type GoalValues = {
  id?: string;
  name: string;
  category: string;
  direction: "decrease" | "increase" | "maintain" | "qualitative" | "improve";
  startingValue?: number;
  targetValue?: number;
  currentValue?: number;
  unit: string;
  startText: string;
  targetText: string;
  startDate: string;
  targetDate?: string;
  status: "active" | "paused" | "completed";
  notes: string;
};

export function GoalForm({ initial, today }: { initial?: GoalValues; today: string }) {
  const { pending, run } = useAction();
  const form = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: initial ?? {
      name: "",
      category: "custom",
      direction: "decrease",
      unit: "",
      startText: "",
      targetText: "",
      startDate: today,
      targetDate: "2026-12-31",
      status: "active",
      notes: "",
    },
  });
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={form.handleSubmit((values) =>
        run(
          () =>
            saveGoalAction({
              ...values,
              id: initial?.id,
              startingValue: numberOrNull(values.startingValue),
              targetValue: numberOrNull(values.targetValue),
              currentValue: numberOrNull(values.currentValue),
              targetDate: values.targetDate || null,
            }),
          "Goal saved",
        ),
      )}
    >
      <Field label="Name"><Input {...form.register("name")} /></Field>
      <Field label="Category" hint="weight and waist read the latest measurement. Other categories use the current value you type.">
        <Input {...form.register("category")} />
      </Field>
      <Field label="Direction">
        <NativeSelect {...form.register("direction")}>
          <option value="decrease">Decrease</option>
          <option value="increase">Increase</option>
          <option value="maintain">Maintain</option>
          <option value="improve">Improve</option>
          <option value="qualitative">Qualitative</option>
        </NativeSelect>
      </Field>
      <Field label="Status">
        <NativeSelect {...form.register("status")}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </NativeSelect>
      </Field>
      <Field label="Start value"><Input type="number" step="any" {...form.register("startingValue", { setValueAs: empty })} /></Field>
      <Field label="Target value"><Input type="number" step="any" {...form.register("targetValue", { setValueAs: empty })} /></Field>
      <Field label="Manual current" hint="Used when the category is not weight or waist.">
        <Input type="number" step="any" {...form.register("currentValue", { setValueAs: empty })} />
      </Field>
      <Field label="Unit"><Input {...form.register("unit")} /></Field>
      <Field label="Start description"><Input {...form.register("startText")} /></Field>
      <Field label="Target description"><Input {...form.register("targetText")} /></Field>
      <Field label="Start date"><Input type="date" {...form.register("startDate")} /></Field>
      <Field label="Target date"><Input type="date" {...form.register("targetDate")} /></Field>
      <div className="md:col-span-2"><Textarea {...form.register("notes")} /></div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>Save goal</Button>
        {initial?.id ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => run(() => deleteGoalAction(initial.id as string), "Goal deleted")}>
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function empty(value: unknown) {
  if (value === "" || value == null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function numberOrNull(value: number | null | undefined) {
  return value == null || Number.isNaN(value) ? null : value;
}
