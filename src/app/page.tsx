import { Suspense } from "react";
import Link from "next/link";
import { FoodLogger } from "@/components/nutrition/food-logger";
import { StepsLog, WaterLog, WeightLog } from "@/components/daily-log";
import { StartWorkout } from "@/components/workouts/start-panel";
import { LineTrend } from "@/components/charts/charts";
import { EmptyState, MacroBar, PageHeader, ScreenFallback, SetupRequired } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clock, grams, kcal, mlToLiters, signedKg, weightLabel } from "@/lib/format";
import { getDashboard } from "@/lib/queries";

export const metadata = { title: "Today" };

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback label="Loading today" />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const data = await getDashboard();
  if (!data.ready) return <SetupRequired />;
  const target = data.target;
  return (
    <div>
      <PageHeader
        eyebrow={data.todayLabel}
        title={`Hello, ${data.profile.name.split(" ")[0]}`}
        description={
          data.daysLeft == null
            ? "Log the day in one place."
            : `${data.daysLeft} days until ${data.targetDate}.`
        }
      />
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <a className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground" href="#log-food">Log food</a>
        <a className="rounded-full bg-secondary px-4 py-2" href="#log-weight">Log weight</a>
        <Link className="rounded-full bg-secondary px-4 py-2" href="/workouts">Start workout</Link>
        <a className="rounded-full bg-secondary px-4 py-2" href="#log-water">Log water</a>
        <a className="rounded-full bg-secondary px-4 py-2" href="#log-steps">Log steps</a>
        <Link className="rounded-full bg-secondary px-4 py-2" href="/body">Log measurements</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s nutrition</CardTitle>
            <CardDescription>
              {data.loggedDayCount ? `Seven-day average uses ${data.loggedDayCount} logged day${data.loggedDayCount === 1 ? "" : "s"}.` : "No meals logged in the last week."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {target ? (
              <>
                <MacroBar label="Calories" value={data.consumed.calories} max={target.calories} display={`${kcal(data.consumed.calories)} / ${target.calories}`} caption={data.remaining ? `${Math.abs(Math.round(data.remaining.calories))} kcal ${data.remaining.calories >= 0 ? "left" : "over"}` : undefined} />
                <MacroBar label="Protein" value={data.consumed.proteinG} max={target.proteinG} display={`${grams(data.consumed.proteinG)} / ${grams(target.proteinG)} g`} caption={data.remaining ? `${grams(Math.abs(data.remaining.proteinG))} g ${data.remaining.proteinG >= 0 ? "left" : "over"}` : undefined} />
                <MacroBar label="Carbs" value={data.consumed.carbsG} max={target.carbsG} display={`${grams(data.consumed.carbsG)} / ${grams(target.carbsG)} g`} />
                <MacroBar label="Fat" value={data.consumed.fatG} max={target.fatG} display={`${grams(data.consumed.fatG)} / ${grams(target.fatG)} g`} />
                <MacroBar label="Water" value={data.waterMl} max={target.waterMl} display={`${mlToLiters(data.waterMl)} / ${mlToLiters(target.waterMl)}`} />
              </>
            ) : (
              <EmptyState title="No calorie target for this date" body="Add one in Settings. Historical days keep whatever target was in effect then." />
            )}
            <p className="text-xs text-muted-foreground">
              Macros are {Math.round(data.percents.protein)}% protein, {Math.round(data.percents.carbs)}% carbs, {Math.round(data.percents.fat)}% fat from protein, carbohydrate, and fat grams.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s workout</CardTitle>
            <CardDescription>{data.planDay ? data.planDay.focus : "No plan assigned to this weekday."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-medium">{data.planDay?.name ?? "Custom day"}</h2>
              {data.completedToday ? <Badge>Completed</Badge> : data.activeWorkout ? <Badge variant="secondary">{data.activeWorkout.status}</Badge> : <Badge variant="outline">Not started</Badge>}
            </div>
            {data.planDay?.notes ? <p className="text-sm text-muted-foreground">{data.planDay.notes}</p> : null}
            <ul className="grid gap-1 text-sm text-muted-foreground">
              {data.planDay?.exercises.map((exercise) => (
                <li key={exercise.id}>{exercise.name}{exercise.targetSets ? ` · ${exercise.targetSets} × ${exercise.targetReps}` : ""}</li>
              ))}
            </ul>
            {data.planDay && data.planDay.exercises.length === 0 ? <p className="text-sm text-muted-foreground">Rest day. A custom workout is still available.</p> : null}
            <StartWorkout date={data.today} planDay={data.planDay ? { id: data.planDay.id, name: data.planDay.name } : null} activeId={data.activeWorkout?.id ?? null} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Body</CardTitle>
            <CardDescription>Baseline {weightLabel(data.baselineWeight, data.settings.weightUnit)} · waist baseline {data.baselineWaistCm.toFixed(1)} cm</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.latestWeight ? (
              <>
                <p className="text-2xl font-semibold tabular-nums">{weightLabel(data.latestWeight.value, data.settings.weightUnit)}</p>
                <p className="text-sm text-muted-foreground">
                  {signedKg(data.latestWeight.value - data.baselineWeight)} from baseline
                  {data.averageWeight7 != null ? ` · 7-day average ${weightLabel(data.averageWeight7, data.settings.weightUnit)}` : ""}
                </p>
                <LineTrend data={data.weightPoints} lines={[{ key: "kg", name: "Weight" }]} />
              </>
            ) : (
              <EmptyState title="No weigh-in yet" body="Your 96 kg baseline is stored on the profile. The chart starts when you log a real weight." />
            )}
            <p className="text-sm text-muted-foreground">
              {data.latestWaistCm != null ? `Latest waist ${data.latestWaistCm.toFixed(1)} cm.` : "No waist measurement logged yet."}
            </p>
            <WeightLog date={data.today} unit={data.settings.weightUnit} previous={data.latestWeight ? `${data.latestWeight.date} · ${weightLabel(data.latestWeight.value, data.settings.weightUnit)}` : undefined} />
          </CardContent>
        </Card>
        <Card id="log-water">
          <CardHeader>
            <CardTitle>Daily activity</CardTitle>
            <CardDescription>Steps, water, and cardio logged today.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm">Steps {data.steps.toLocaleString("en-US")}{target ? ` / ${target.steps.toLocaleString("en-US")}` : ""}</p>
            <StepsLog date={data.today} current={data.steps} />
            <p className="text-sm">Cardio {clock(data.cardioSeconds)} · {data.cardioKm.toFixed(2)} km · workout {data.completedToday ? "done" : data.activeWorkout ? "in progress" : "not started"}</p>
            <WaterLog date={data.today} />
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Log food</CardTitle>
          <CardDescription>Portions scale from the food record. 48 g of whey at 24 g protein per 32 g is 36 g protein.</CardDescription>
        </CardHeader>
        <CardContent>
          <FoodLogger foods={data.foods} date={data.today} recentIds={[]}  />
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Insights</CardTitle>
          <CardDescription>Only from records already in FORGE.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {data.insights.map((insight) => (
            <p key={insight.id} className={insight.tone === "caution" ? "text-sm text-destructive" : "text-sm"}>
              {insight.text}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
