import { Suspense } from "react";
import Link from "next/link";
import { FoodLogger } from "@/components/nutrition/food-logger";
import { DayTools, MealList } from "@/components/nutrition/meal-controls";
import { EmptyState, MacroBar, PageHeader, ScreenFallback, SetupRequired } from "@/components/bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { grams, kcal } from "@/lib/format";
import { addDaysKey } from "@/lib/dates";
import { getNutrition } from "@/lib/queries";

export const metadata = { title: "Nutrition" };

export default function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  return (
    <Suspense fallback={<ScreenFallback label="Loading nutrition" />}>
      <Nutrition searchParams={searchParams} />
    </Suspense>
  );
}

async function Nutrition({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const data = await getNutrition(date);
  if (!data.ready) return <SetupRequired />;
  const previous = addDaysKey(data.date, -1);
  const next = addDaysKey(data.date, 1);
  return (
    <div>
      <PageHeader
        eyebrow="Nutrition"
        title={data.dateLabel}
        description="Gram-based logging with snapshots, so editing a food later does not rewrite this day."
        action={
          <div className="flex gap-2 text-sm">
            <Link className="rounded-lg border border-border px-3 py-2" href={`/nutrition?date=${previous}`}>Previous</Link>
            <Link className="rounded-lg border border-border px-3 py-2" href="/nutrition">Today</Link>
            <Link className="rounded-lg border border-border px-3 py-2" href={`/nutrition?date=${next}`}>Next</Link>
            <Link className="rounded-lg bg-secondary px-3 py-2" href="/nutrition/foods">Foods</Link>
          </div>
        }
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="sticky top-2 z-20">
          <CardHeader><CardTitle>Daily totals</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {data.target ? (
              <>
                <MacroBar label="Calories" value={data.consumed.calories} max={data.target.calories} display={`${kcal(data.consumed.calories)} kcal`} caption={data.remaining ? `${Math.abs(Math.round(data.remaining.calories))} ${data.remaining.calories >= 0 ? "left" : "over"}` : ""} />
                <MacroBar label="Protein" value={data.consumed.proteinG} max={data.target.proteinG} display={`${grams(data.consumed.proteinG)} g`} />
                <MacroBar label="Carbs" value={data.consumed.carbsG} max={data.target.carbsG} display={`${grams(data.consumed.carbsG)} g`} />
                <MacroBar label="Fat" value={data.consumed.fatG} max={data.target.fatG} display={`${grams(data.consumed.fatG)} g`} />
              </>
            ) : <p className="text-sm">{kcal(data.consumed.calories)} kcal logged. No target for this date.</p>}
            <p className="text-sm text-muted-foreground">
              Fiber {grams(data.consumed.fiberG)} g · sugar {grams(data.consumed.sugarG)} g
              {data.sodiumIncomplete ? ` · sodium ${Math.round(data.sodiumMg)} mg from foods that have a sodium value. The total is incomplete.` : ` · sodium ${Math.round(data.sodiumMg)} mg`}
            </p>
            <p className="text-sm text-muted-foreground">
              Macro split {Math.round(data.percents.protein)}% protein / {Math.round(data.percents.carbs)}% carbs / {Math.round(data.percents.fat)}% fat.
              {data.averages.calories != null ? ` Seven-day average ${kcal(data.averages.calories)} kcal and ${data.averages.protein ? grams(data.averages.protein) : "0"} g protein across ${data.averages.days} logged day${data.averages.days === 1 ? "" : "s"}.` : " Log a few days to see a seven-day average."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Calendar</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day}>{day}</div>)}
              {data.calendar.map((day) => (
                <Link key={day.date} href={`/nutrition?date=${day.date}`} className={`rounded-lg px-1 py-2 ${day.date === data.date ? "bg-primary text-primary-foreground" : day.inMonth ? "bg-muted" : "opacity-40"}`}>
                  <div>{day.date.slice(8)}</div>
                  <div className="tabular-nums">{day.calories != null ? Math.round(day.calories) : "·"}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="mb-4">
        <CardHeader><CardTitle>Add food</CardTitle></CardHeader>
        <CardContent>
          <FoodLogger foods={data.foods} date={data.date} recentIds={data.recentIds} />
        </CardContent>
      </Card>
      <div className="mb-4">
        <MealList meals={data.meals} date={data.date} />
      </div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Templates and recipes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.savedMeals.length === 0 && data.recipes.length === 0 ? (
            <EmptyState title="No saved meals yet" body="Protein Oatmeal is created by the seed. If you deleted it, save any logged meal as a template." />
          ) : (
            <DayTools date={data.date} today={data.today} savedMeals={data.savedMeals} recipes={data.recipes} frequent={data.frequent} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent days</CardTitle></CardHeader>
        <CardContent className="grid gap-1 text-sm">
          {data.history.map((day) => (
            <Link key={day.date} href={`/nutrition?date=${day.date}`} className="flex justify-between rounded-lg px-2 py-1 hover:bg-muted">
              <span>{day.date}</span>
              <span className="tabular-nums text-muted-foreground">{day.calories == null ? "Not logged" : `${kcal(day.calories)} kcal · ${grams(day.proteinG ?? 0)} g protein`}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
