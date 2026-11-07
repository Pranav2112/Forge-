"use client";

import { useState } from "react";
import { HYROX_STATIONS } from "@/lib/constants";
import { clock } from "@/lib/format";
import { deleteHyroxAction, logHyroxAction } from "@/lib/actions";
import { useAction } from "@/components/use-action";
import { Field, NativeSelect } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Segment = {
  segmentType: "run" | "station" | "rest";
  station: string;
  distanceM: string;
  reps: string;
  weightKg: string;
  minutes: string;
  seconds: string;
  notes: string;
};

const blank = (): Segment => ({
  segmentType: "station",
  station: "skierg",
  distanceM: "",
  reps: "",
  weightKg: "",
  minutes: "",
  seconds: "",
  notes: "",
});

export function HyroxForm({ date }: { date: string }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState("Station practice");
  const [kind, setKind] = useState<"station" | "simulation">("station");
  const [notes, setNotes] = useState("");
  const [segments, setSegments] = useState<Segment[]>([{ ...blank(), station: "skierg", distanceM: "500" }]);

  function update(index: number, patch: Partial<Segment>) {
    setSegments((current) => current.map((segment, i) => (i === index ? { ...segment, ...patch } : segment)));
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            logHyroxAction({
              date,
              name,
              kind,
              notes,
              segments: segments.map((segment) => {
                const duration = Number(segment.minutes || 0) * 60 + Number(segment.seconds || 0);
                return {
                  segmentType: segment.segmentType,
                  station: segment.segmentType === "run" ? "run" : segment.station,
                  distanceM: segment.distanceM ? Number(segment.distanceM) : null,
                  reps: segment.reps ? Number(segment.reps) : null,
                  weightKg: segment.weightKg ? Number(segment.weightKg) : null,
                  durationSeconds: duration > 0 ? duration : null,
                  notes: segment.notes,
                };
              }),
            }),
          "HYROX session saved",
        );
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Kind">
          <NativeSelect value={kind} onChange={(event) => setKind(event.target.value as "station" | "simulation")}>
            <option value="station">Single station or partial</option>
            <option value="simulation">Simulation</option>
          </NativeSelect>
        </Field>
      </div>
      {segments.map((segment, index) => (
        <div key={index} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-4">
          <Field label="Piece">
            <NativeSelect value={segment.segmentType} onChange={(event) => update(index, { segmentType: event.target.value as Segment["segmentType"] })}>
              <option value="run">Run</option>
              <option value="station">Station</option>
              <option value="rest">Rest</option>
            </NativeSelect>
          </Field>
          {segment.segmentType === "station" ? (
            <Field label="Station">
              <NativeSelect value={segment.station} onChange={(event) => update(index, { station: event.target.value })}>
                {HYROX_STATIONS.filter((station) => station.id !== "run").map((station) => (
                  <option key={station.id} value={station.id}>{station.name}</option>
                ))}
              </NativeSelect>
            </Field>
          ) : <div />}
          <Field label="Distance (m)"><Input value={segment.distanceM} onChange={(event) => update(index, { distanceM: event.target.value })} /></Field>
          <Field label="Reps"><Input value={segment.reps} onChange={(event) => update(index, { reps: event.target.value })} /></Field>
          <Field label="Weight (kg)"><Input value={segment.weightKg} onChange={(event) => update(index, { weightKg: event.target.value })} /></Field>
          <Field label="Minutes"><Input value={segment.minutes} onChange={(event) => update(index, { minutes: event.target.value })} /></Field>
          <Field label="Seconds"><Input value={segment.seconds} onChange={(event) => update(index, { seconds: event.target.value })} /></Field>
          <Field label="Notes"><Input value={segment.notes} onChange={(event) => update(index, { notes: event.target.value })} /></Field>
          <Button type="button" variant="ghost" onClick={() => setSegments((current) => current.filter((_, i) => i !== index))}>Remove piece</Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setSegments((current) => [...current, blank()])}>Add piece</Button>
        <Button type="button" variant="outline" onClick={() => setSegments(simulationTemplate())}>Load 8 runs + 8 stations</Button>
      </div>
      <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Session notes" />
      <p className="text-sm text-muted-foreground">
        Totals add up the times you enter. A partial simulation is not an official HYROX finish time, and a full practice is still not a race prediction.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>Save session</Button>
    </form>
  );
}

function simulationTemplate(): Segment[] {
  const pieces: Segment[] = [];
  const stations = ["skierg", "sled_push", "sled_pull", "burpee_broad_jump", "rowing", "farmers_carry", "sandbag_lunges", "wall_balls"];
  for (const station of stations) {
    pieces.push({ ...blank(), segmentType: "run", station: "run", distanceM: "1000" });
    const meta = HYROX_STATIONS.find((item) => item.id === station);
    pieces.push({
      ...blank(),
      segmentType: "station",
      station,
      distanceM: meta?.officialMeters ? String(meta.officialMeters) : "",
      reps: meta?.officialReps ? String(meta.officialReps) : "",
    });
  }
  return pieces;
}

export function DeleteHyrox({ id }: { id: string }) {
  const { pending, run } = useAction();
  return (
    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteHyroxAction(id), "Deleted")}>
      Delete
    </Button>
  );
}

export function TimeText({ seconds }: { seconds: number }) {
  return <span className="tabular-nums">{clock(seconds)}</span>;
}
