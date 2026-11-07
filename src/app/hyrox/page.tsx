import { Suspense } from "react";
import { DeleteHyrox, HyroxForm, TimeText } from "@/components/hyrox/hyrox-form";
import { EmptyState, PageHeader, ScreenFallback, SetupRequired } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stationName } from "@/lib/constants";
import { getHyrox } from "@/lib/queries";

export const metadata = { title: "HYROX" };

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback label="Loading HYROX" />}>
      <Hyrox />
    </Suspense>
  );
}

async function Hyrox() {
  const data = await getHyrox();
  if (!data.ready) return <SetupRequired />;
  return (
    <div>
      <PageHeader eyebrow="HYROX" title="Stations and simulations" description="Log partial distances. Official-distance bests appear only when the piece meets the race distance or rep count and has a time." />
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.bests.map((station) => (
          <Card key={station.id}>
            <CardHeader>
              <CardTitle>{station.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Race piece: {station.officialReps ? `${station.officialReps} reps` : `${station.officialMeters} m`}</p>
              <p className="mt-1 text-foreground">{station.best ? <TimeText seconds={station.best.durationSeconds} /> : "No official-distance best yet"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mb-4">
        <CardHeader><CardTitle>Log a station or build a simulation</CardTitle></CardHeader>
        <CardContent><HyroxForm date={data.today} /></CardContent>
      </Card>
      <div className="grid gap-3">
        {data.sessions.length === 0 ? <EmptyState title="No HYROX sessions" body="A 500 m SkiErg or a 30-rep wall-ball set is enough to start the history." /> : data.sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {session.date} · {session.name}
                <Badge variant="outline">{session.kind}</Badge>
                {session.isCompleteSimulation ? <Badge>All 8 runs and stations timed</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p className="text-muted-foreground">
                Recorded {session.completeTiming ? <TimeText seconds={session.recorded} /> : "partial timing"} · runs <TimeText seconds={session.running} /> · stations <TimeText seconds={session.stations} /> · transitions <TimeText seconds={session.rest} />
              </p>
              <p className="text-muted-foreground">These totals are the times you entered. They are not an official race prediction.</p>
              {session.notes ? <p>{session.notes}</p> : null}
              <ul className="grid gap-1">
                {session.segments.map((segment) => (
                  <li key={segment.id}>
                    {segment.segmentType === "rest" ? "Rest" : stationName(segment.station || segment.segmentType)}
                    {segment.distanceM ? ` · ${segment.distanceM} m` : ""}
                    {segment.reps ? ` · ${segment.reps} reps` : ""}
                    {segment.weightKg ? ` · ${segment.weightKg} kg` : ""}
                    {segment.durationSeconds ? ` · ` : ""}
                    {segment.durationSeconds ? <TimeText seconds={segment.durationSeconds} /> : " · no time"}
                    {segment.distanceM && segment.durationSeconds ? ` · ${(segment.durationSeconds / (segment.distanceM / 1000) / 60).toFixed(2)} min/km pace if this was continuous` : ""}
                  </li>
                ))}
              </ul>
              <DeleteHyrox id={session.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
