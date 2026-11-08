import { Suspense } from "react";
import Link from "next/link";
import { CardioForm, DeleteCardio } from "@/components/workouts/cardio-form";
import { StartWorkout } from "@/components/workouts/start-panel";
import { EmptyState, PageHeader, ScreenFallback, SetupRequired } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clock, paceLabel } from "@/lib/format";
import { getWorkouts } from "@/lib/queries";

export const metadata = { title: "Workouts" };

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback label="Loading workouts" />}>
      <Workouts />
    </Suspense>
  );
}

async function Workouts() {
  const data = await getWorkouts();
  if (!data.ready) return <SetupRequired />;
  return (
    <div>
      <PageHeader eyebrow={data.todayLabel} title="Workouts" description="Start from today's plan or log cardio on its own. An open workout stays in the database if you refresh." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Start</CardTitle></CardHeader>
          <CardContent>
            <StartWorkout
              date={data.today}
              planDay={data.planDay}
              activeId={data.active?.id ?? null}
              lastCompleted={data.sessions.find((session) => session.status === "completed") ?? null}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {data.sessions.length === 0 ? <EmptyState title="No workouts yet" body="Start today's plan and log the first set." /> : data.sessions.map((session) => (
              <Link key={session.id} href={`/workouts/${session.id}`} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted">
                <span>{session.date} · {session.name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline">{session.status}</Badge>
                  {session.sets} {session.sets === 1 ? "set" : "sets"} · {Math.round(session.volumeKg)} kg
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Cardio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <CardioForm date={data.today} distanceUnit={data.settings.distanceUnit} weightKg={null} />
          {data.cardio.length === 0 ? <EmptyState title="No cardio logged" body="Runs, rows, SkiErg, rides, and walks show up here and in analytics." /> : (
            <div className="grid gap-2">
              {data.cardio.map((session) => (
                <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                  <span>
                    {session.date} · {session.activity.replaceAll("_", " ")} · {clock(session.durationSeconds)}
                    {session.distanceKm ? ` · ${session.distanceKm.toFixed(2)} km` : ""}
                    {session.pace ? ` · ${paceLabel(session.pace, data.settings.distanceUnit)}` : ""}
                    {session.caloriesAreEstimate ? " · calorie estimate" : ""}
                  </span>
                  <DeleteCardio id={session.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
