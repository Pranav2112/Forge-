import { Suspense } from "react";
import { BarTrend, LineTrend } from "@/components/charts/charts";
import { EmptyState, PageHeader, ScreenFallback, SetupRequired } from "@/components/bits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clock, paceLabel } from "@/lib/format";
import { getAnalytics } from "@/lib/queries";

export const metadata = { title: "Analytics" };

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback label="Loading analytics" />}>
      <Analytics />
    </Suspense>
  );
}

async function Analytics() {
  const data = await getAnalytics();
  if (!data.ready) return <SetupRequired />;
  const bench = data.lifts.find((lift) => lift.name === "Barbell Bench Press");
  const squat = data.lifts.find((lift) => lift.name === "Barbell Squat");
  const deadlift = data.lifts.find((lift) => lift.name === "Deadlift");
  return (
    <div>
      <PageHeader eyebrow="Analytics" title="What the log actually shows" description="Empty charts stay empty. Nothing here is sample data." />
      <Tabs defaultValue="body">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="strength">Strength</TabsTrigger>
          <TabsTrigger value="cardio">Cardio</TabsTrigger>
          <TabsTrigger value="consistency">Consistency</TabsTrigger>
        </TabsList>
        <TabsContent value="body" className="grid gap-4">
          <Card>
            <CardHeader><CardTitle>Weight</CardTitle><CardDescription>Daily representative weight and a trailing 7-point average.</CardDescription></CardHeader>
            <CardContent>{data.weightChart.length ? <LineTrend data={data.weightChart} lines={[{ key: "kg", name: "Weight" }, { key: "avg", name: "7-point average", color: "#8eb6ff" }]} /> : <EmptyState title="No weight chart" body="Log at least one weigh-in." />}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Waist</CardTitle></CardHeader>
            <CardContent>{data.waist.length ? <LineTrend data={data.waist} lines={[{ key: "cm", name: "Waist cm" }]} /> : <EmptyState title="No waist trend" body="Add a waist measurement on the body page." />}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Change versus 7 days earlier</CardTitle></CardHeader>
            <CardContent>{data.weeklyChange.length ? <BarTrend data={data.weeklyChange} xKey="date" yKey="kg" name="kg" /> : <EmptyState title="Need two weigh-ins a week apart" body="This appears after you have a point and another about seven days earlier." />}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="nutrition" className="grid gap-4">
          <Card>
            <CardHeader><CardTitle>Calories by day</CardTitle><CardDescription>{data.nutritionDays} days with food logged.</CardDescription></CardHeader>
            <CardContent>{data.nutrition.length ? <BarTrend data={data.nutrition} xKey="date" yKey="calories" name="Calories" /> : <EmptyState title="No nutrition chart" body="Log a meal first." />}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Protein by day</CardTitle></CardHeader>
            <CardContent>{data.nutrition.length ? <LineTrend data={data.nutrition} lines={[{ key: "protein", name: "Protein g" }]} /> : null}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Macro split of logged days</CardTitle></CardHeader>
            <CardContent>
              {data.nutritionDays ? <p>{Math.round(data.percents.protein)}% protein · {Math.round(data.percents.carbs)}% carbs · {Math.round(data.percents.fat)}% fat, from grams, not from the calorie field.</p> : <EmptyState title="No macro split" body="It is calculated from logged food." />}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="strength" className="grid gap-4">
          <LiftCard title="Bench press" lift={bench} />
          <LiftCard title="Squat" lift={squat} />
          <LiftCard title="Deadlift" lift={deadlift} />
          <Card>
            <CardHeader><CardTitle>Volume by muscle</CardTitle><CardDescription>Working sets only. Warm-ups are excluded. Weight is converted to kilograms.</CardDescription></CardHeader>
            <CardContent>{data.muscles.length ? <BarTrend data={data.muscles} xKey="muscle" yKey="volume" name="Volume kg" /> : <EmptyState title="No training volume" body="Finish a workout with weighted sets." />}</CardContent>
          </Card>
          {data.lifts.filter((lift) => !["Barbell Bench Press", "Barbell Squat", "Deadlift"].includes(lift.name)).map((lift) => (
            <LiftCard key={lift.name} title={lift.name} lift={lift} />
          ))}
        </TabsContent>
        <TabsContent value="cardio" className="grid gap-4">
          <Card>
            <CardHeader><CardTitle>Running distance by day</CardTitle><CardDescription>Cardio runs plus HYROX run pieces. Log a run once so it is not counted twice.</CardDescription></CardHeader>
            <CardContent>{data.runDistance.length ? <BarTrend data={data.runDistance} xKey="date" yKey="km" name="km" /> : <EmptyState title="No runs" body="Log a treadmill or outdoor run, or a run segment in HYROX." />}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Weekly running volume</CardTitle></CardHeader>
            <CardContent>{data.weeklyRun.length ? <BarTrend data={data.weeklyRun} xKey="week" yKey="km" name="km" /> : null}</CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-2 pt-4 text-sm">
              <p>Fastest near-1 km: {data.fastest1k ? `${clock(data.fastest1k.durationSeconds)} for ${data.fastest1k.distanceKm.toFixed(2)} km` : "Log a run within 50 m of 1 km."}</p>
              <p>Fastest near-5 km: {data.fastest5k ? `${clock(data.fastest5k.durationSeconds)} for ${data.fastest5k.distanceKm.toFixed(2)} km` : "Log a run within 100 m of 5 km."}</p>
              <p>Longest run: {data.longest ? `${data.longest.distanceKm.toFixed(2)} km on ${data.longest.date}` : "None yet."}</p>
              <p>Average pace: {data.averagePace ? paceLabel(data.averagePace, data.settings.distanceUnit) : "None yet."}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Weekly cardio time</CardTitle></CardHeader>
            <CardContent>{data.cardioMinutes.length ? <BarTrend data={data.cardioMinutes} xKey="week" yKey="minutes" name="Minutes" /> : <EmptyState title="No cardio time" body="Cardio sessions on the workout page fill this chart." />}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>SkiErg pace</CardTitle></CardHeader>
            <CardContent>{data.skierg.length ? <LineTrend data={data.skierg.map((row) => ({ date: row.date, pace: Math.round(row.pace ?? 0) }))} lines={[{ key: "pace", name: "sec/km" }]} /> : <EmptyState title="No SkiErg pieces" body="Log a timed SkiErg distance on the HYROX page." />}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Rowing pace</CardTitle></CardHeader>
            <CardContent>{data.rowing.length ? <LineTrend data={data.rowing.map((row) => ({ date: row.date, pace: Math.round(row.pace ?? 0) }))} lines={[{ key: "pace", name: "sec/km" }]} /> : <EmptyState title="No rowing pieces" body="Log a timed row on the HYROX page." />}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="consistency">
          <Card>
            <CardHeader><CardTitle>Days with a record</CardTitle><CardDescription>Counts of distinct dates, not a streak invented from empty days.</CardDescription></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p>Workouts completed: {data.consistency.workouts} days</p>
              <p>Food logged: {data.consistency.foodDays} days</p>
              <p>Weight logged: {data.consistency.weightDays} days</p>
              <p>Steps logged: {data.consistency.stepDays} days</p>
              <p>Water logged: {data.consistency.waterDays} days</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LiftCard({ title, lift }: { title: string; lift?: { points: { date: string; estimate: number | null; volume: number }[] } }) {
  const points = (lift?.points ?? []).filter((point) => point.estimate);
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>Best Epley estimate per session. Sets over 12 reps are left out.</CardDescription></CardHeader>
      <CardContent>
        {points.length ? <LineTrend data={points} lines={[{ key: "estimate", name: "Est. 1RM kg" }]} /> : <EmptyState title={`No ${title.toLowerCase()} data`} body="Finish a workout that includes this lift." />}
      </CardContent>
    </Card>
  );
}
