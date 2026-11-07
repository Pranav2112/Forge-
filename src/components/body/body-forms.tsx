"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toCm } from "@/lib/calc";
import { deleteMeasurementAction, deletePhotoAction, deleteWeightAction, logMeasurementAction, uploadPhotoAction } from "@/lib/actions";
import { measurementSchema } from "@/lib/validators";
import { useAction } from "@/components/use-action";
import { Field, NativeSelect } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = [
  ["waistCm", "Waist"],
  ["chestCm", "Chest"],
  ["hipsCm", "Hips"],
  ["neckCm", "Neck"],
  ["leftArmCm", "Left arm"],
  ["rightArmCm", "Right arm"],
  ["leftThighCm", "Left thigh"],
  ["rightThighCm", "Right thigh"],
  ["leftCalfCm", "Left calf"],
  ["rightCalfCm", "Right calf"],
] as const;

export function MeasurementForm({ date, unit }: { date: string; unit: string }) {
  const { pending, run } = useAction();
  const form = useForm({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      date,
      bodyFatMethod: "" as "" | "measured" | "estimate",
      notes: "",
    },
  });

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={form.handleSubmit((values) => {
        const data: Record<string, unknown> = { date: values.date, notes: values.notes ?? "", bodyFatMethod: values.bodyFatMethod };
        for (const [key] of FIELDS) {
          const raw = values[key as keyof typeof values];
          data[key] = typeof raw === "number" && Number.isFinite(raw) ? toCm(raw, unit) : null;
        }
        const fat = values.bodyFatPercent;
        data.bodyFatPercent = typeof fat === "number" && Number.isFinite(fat) ? fat : null;
        run(() => logMeasurementAction(data), "Measurements saved");
      })}
    >
      <Field label="Date"><Input type="date" {...form.register("date")} /></Field>
      {FIELDS.map(([key, label]) => (
        <Field key={key} label={`${label} (${unit})`}>
          <Input type="number" step="0.1" {...form.register(key, { setValueAs: empty })} />
        </Field>
      ))}
      <Field label="Body fat %" hint="Only if you measured it or you are explicitly storing an estimate.">
        <Input type="number" step="0.1" {...form.register("bodyFatPercent", { setValueAs: empty })} />
      </Field>
      <Field label="Body-fat method">
        <NativeSelect {...form.register("bodyFatMethod")}>
          <option value="">None</option>
          <option value="measured">Measured</option>
          <option value="estimate">Estimate</option>
        </NativeSelect>
      </Field>
      <div className="md:col-span-2"><Textarea placeholder="Notes" {...form.register("notes")} /></div>
      <Button type="submit" disabled={pending}>Save measurements</Button>
    </form>
  );
}

function empty(value: unknown) {
  if (value === "" || value == null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function DeleteRow({ id, kind }: { id: string; kind: "weight" | "measurement" }) {
  const { pending, run } = useAction();
  return (
    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => (kind === "weight" ? deleteWeightAction(id) : deleteMeasurementAction(id)), "Deleted")}>
      Delete
    </Button>
  );
}

export function PhotoForm({ date, enabled }: { date: string; enabled: boolean }) {
  const { pending, error, run } = useAction();
  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Progress photos stay off on a public deployment. Set FORGE_PRIVATE_DEPLOYMENT=true only on a machine you control, and add authentication before anyone else can reach it.
      </p>
    );
  }
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        run(() => uploadPhotoAction(data), "Photo saved");
      }}
    >
      <input type="hidden" name="date" value={date} />
      <Field label="Angle">
        <NativeSelect name="angle" defaultValue="front">
          <option value="front">Front</option>
          <option value="side">Side</option>
          <option value="back">Back</option>
        </NativeSelect>
      </Field>
      <Field label="Photo" hint="JPEG, PNG, or WebP. 8 MB max. Stored in data/photos, not in the public folder.">
        <Input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
      </Field>
      <Input name="notes" placeholder="Notes" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>Upload</Button>
    </form>
  );
}

export function DeletePhoto({ id }: { id: string }) {
  const { pending, run } = useAction();
  return <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deletePhotoAction(id), "Photo deleted")}>Delete</Button>;
}
