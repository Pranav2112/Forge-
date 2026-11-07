"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fromCm, fromKg, toCm, toKg } from "@/lib/calc";
import { exportCsvAction, exportJsonAction, importBackupAction, saveProfileAction, saveSettingsAction, saveTargetAction } from "@/lib/actions";
import { profileSchema, settingsSchema, targetSchema } from "@/lib/validators";
import { useAction } from "@/components/use-action";
import { Field, NativeSelect } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ProfileForm({
  profile,
  weightUnit,
  lengthUnit,
}: {
  profile: {
    name: string;
    age: number;
    sex: string;
    heightCm: number;
    diet: string;
    allowedFoods: string[];
    excludedFoods: string[];
    baselineWeightKg: number;
    baselineWaistCm: number;
    abdominalDefinition: string;
    timezone: string;
  };
  weightUnit: string;
  lengthUnit: string;
}) {
  const { pending, run } = useAction();
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      ...profile,
      allowedFoods: profile.allowedFoods.join(", "),
      excludedFoods: profile.excludedFoods.join(", "),
      heightCm: lengthUnit === "in" ? fromCm(profile.heightCm, "in") : profile.heightCm,
      baselineWeightKg: fromKg(profile.baselineWeightKg, weightUnit),
      baselineWaistCm: fromCm(profile.baselineWaistCm, lengthUnit),
    },
  });
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={form.handleSubmit((values) =>
        run(
          () =>
            saveProfileAction({
              ...values,
              baselineWeightKg: toKg(values.baselineWeightKg, weightUnit),
              baselineWaistCm: toCm(values.baselineWaistCm, lengthUnit),
              heightCm: lengthUnit === "in" ? toCm(values.heightCm, "in") : values.heightCm,
            }),
          "Profile saved",
        ),
      )}
    >
      <Field label="Name"><Input {...form.register("name")} /></Field>
      <Field label="Age"><Input type="number" {...form.register("age", { valueAsNumber: true })} /></Field>
      <Field label="Sex"><Input {...form.register("sex")} /></Field>
      <Field label={lengthUnit === "in" ? "Height (in)" : "Height (cm)"}><Input type="number" step="0.1" {...form.register("heightCm", { valueAsNumber: true })} /></Field>
      <Field label="Diet"><Input {...form.register("diet")} /></Field>
      <Field label="Timezone"><Input {...form.register("timezone")} /></Field>
      <Field label={`Baseline weight (${weightUnit})`} hint="Changing this does not rewrite weigh-ins.">
        <Input type="number" step="0.1" {...form.register("baselineWeightKg", { valueAsNumber: true })} />
      </Field>
      <Field label={`Baseline waist (${lengthUnit})`}>
        <Input type="number" step="0.1" {...form.register("baselineWaistCm", { valueAsNumber: true })} />
      </Field>
      <Field label="Abdominal definition"><Input {...form.register("abdominalDefinition")} /></Field>
      <div className="md:col-span-2"><Field label="Allowed foods" hint="Comma separated"><Input {...form.register("allowedFoods")} /></Field></div>
      <div className="md:col-span-2"><Field label="Excluded foods"><Input {...form.register("excludedFoods")} /></Field></div>
      <Button type="submit" disabled={pending}>Save profile</Button>
    </form>
  );
}

export function TargetForm({
  today,
  target,
}: {
  today: string;
  target: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; steps: number; waterMl: number; notes: string } | null;
}) {
  const { pending, run } = useAction();
  const form = useForm({
    resolver: zodResolver(targetSchema),
    defaultValues: {
      effectiveFrom: today,
      calories: target?.calories ?? 2100,
      proteinG: target?.proteinG ?? 180,
      carbsG: target?.carbsG ?? 210,
      fatG: target?.fatG ?? 60,
      fiberG: target?.fiberG ?? 30,
      steps: target?.steps ?? 9000,
      waterMl: target?.waterMl ?? 3000,
      notes: target?.notes ?? "",
    },
  });
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={form.handleSubmit((values) => run(() => saveTargetAction(values), "Targets saved"))}
    >
      <Field label="Effective from" hint="Older days keep the target that was already in effect.">
        <Input type="date" {...form.register("effectiveFrom")} />
      </Field>
      <Field label="Calories"><Input type="number" {...form.register("calories", { valueAsNumber: true })} /></Field>
      <Field label="Protein (g)"><Input type="number" step="1" {...form.register("proteinG", { valueAsNumber: true })} /></Field>
      <Field label="Carbs (g)"><Input type="number" step="1" {...form.register("carbsG", { valueAsNumber: true })} /></Field>
      <Field label="Fat (g)"><Input type="number" step="1" {...form.register("fatG", { valueAsNumber: true })} /></Field>
      <Field label="Fiber (g)"><Input type="number" step="1" {...form.register("fiberG", { valueAsNumber: true })} /></Field>
      <Field label="Steps"><Input type="number" {...form.register("steps", { valueAsNumber: true })} /></Field>
      <Field label="Water (ml)"><Input type="number" {...form.register("waterMl", { valueAsNumber: true })} /></Field>
      <div className="md:col-span-2"><Textarea {...form.register("notes")} /></div>
      {form.formState.errors.calories ? <p className="text-sm text-destructive">{form.formState.errors.calories.message}</p> : null}
      <Button type="submit" disabled={pending}>Save targets</Button>
    </form>
  );
}

export function UnitsForm({
  settings,
}: {
  settings: { weightUnit: string; lengthUnit: string; distanceUnit: string; restTimerSeconds: number; usdaApiKey: string };
}) {
  const { pending, run } = useAction();
  const form = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      weightUnit: settings.weightUnit === "lb" ? "lb" as const : "kg" as const,
      lengthUnit: settings.lengthUnit === "in" ? "in" as const : "cm" as const,
      distanceUnit: settings.distanceUnit === "mi" ? "mi" as const : "km" as const,
      restTimerSeconds: settings.restTimerSeconds,
      usdaApiKey: settings.usdaApiKey,
    },
  });
  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((values) => run(() => saveSettingsAction(values), "Settings saved"))}>
      <Field label="Weight">
        <NativeSelect {...form.register("weightUnit")}>
          <option value="kg">Kilograms</option>
          <option value="lb">Pounds</option>
        </NativeSelect>
      </Field>
      <Field label="Length">
        <NativeSelect {...form.register("lengthUnit")}>
          <option value="cm">Centimeters</option>
          <option value="in">Inches</option>
        </NativeSelect>
      </Field>
      <Field label="Distance">
        <NativeSelect {...form.register("distanceUnit")}>
          <option value="km">Kilometers</option>
          <option value="mi">Miles</option>
        </NativeSelect>
      </Field>
      <Field label="Default rest (seconds)"><Input type="number" {...form.register("restTimerSeconds", { valueAsNumber: true })} /></Field>
      <div className="md:col-span-2">
        <Field label="USDA API key" hint="Optional. Stored in the local database. A free key is available from FoodData Central. Leave blank to skip USDA search.">
          <Input type="password" autoComplete="off" {...form.register("usdaApiKey")} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>Save units</Button>
    </form>
  );
}

export function BackupPanel() {
  const { pending, error, run } = useAction();
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [fileName, setFileName] = useState("");

  async function download(kind: "json" | "nutrition" | "workouts" | "weight") {
    const result = kind === "json" ? await exportJsonAction() : await exportCsvAction(kind);
    if (!result.ok || !("data" in result)) return;
    const blob = new Blob([result.data], { type: kind === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = kind === "json" ? "forge-backup.json" : `forge-${kind}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={() => download("json")}>Export JSON</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => download("nutrition")}>Nutrition CSV</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => download("workouts")}>Workout CSV</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => download("weight")}>Weight CSV</Button>
      </div>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const file = (event.currentTarget.elements.namedItem("backup") as HTMLInputElement).files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            run(
              () =>
                importBackupAction({
                  json: String(reader.result ?? ""),
                  mode,
                  allowDuplicate,
                  confirmation,
                }),
              "Backup imported",
            );
          };
          reader.readAsText(file);
        }}
      >
        <Field label="Import a JSON backup">
          <Input
            name="backup"
            type="file"
            accept="application/json"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
        </Field>
        <Field label="Mode">
          <NativeSelect value={mode} onChange={(event) => setMode(event.target.value as "merge" | "replace")}>
            <option value="merge">Merge — skip records that already exist</option>
            <option value="replace">Replace — delete current data, then restore</option>
          </NativeSelect>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allowDuplicate} onChange={(event) => setAllowDuplicate(event.target.checked)} />
          Import even if this file was imported before
        </label>
        {mode === "replace" ? (
          <Field label="Type REPLACE MY DATA">
            <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </Field>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant={mode === "replace" ? "destructive" : "default"} disabled={pending || !fileName}>
          Import backup
        </Button>
      </form>
    </div>
  );
}
