import { Suspense } from "react";
import { GoalForm } from "@/components/goals/goal-form";
import { PageHeader, ScreenFallback, SetupRequired } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysUntil } from "@/lib/dates";
import { getGoals } from "@/lib/queries";

export const metadata = { title: "Goals" };

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback label="Loading goals" />}>
      <Goals />
    </Suspense>
  );
}

async function Goals() {
  const data = await getGoals();
  if (!data.ready) return <SetupRequired />;
  return (
    <div>
      <PageHeader eyebrow="Goals" title="Targets you can change" description="Weight and waist goals read the latest real measurement. Editing a goal does not rewrite old weigh-ins." />
      <div className="grid gap-4">
        {data.goals.map((goal) => {
          const remaining = goal.targetDate ? daysUntil(data.today, goal.targetDate) : null;
          return (
            <Card key={goal.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {goal.name}
                  <Badge variant="outline">{goal.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  {goal.startText ? `From ${goal.startText}. ` : ""}
                  {goal.targetText ? `Toward ${goal.targetText}. ` : ""}
                  {goal.startingValue != null ? `Start ${goal.startingValue} ${goal.unit}. ` : ""}
                  {goal.targetValue != null ? `Target ${goal.targetValue} ${goal.unit}. ` : "No numeric target yet. "}
                  {goal.resolvedCurrent != null ? `Current ${Math.round(goal.resolvedCurrent * 10) / 10} ${goal.unit}. ` : ""}
                  {remaining != null ? (remaining >= 0 ? `${remaining} days left.` : "Target date has passed.") : ""}
                </p>
                {goal.progress != null ? (
                  <div className="h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={Math.round(goal.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={goal.name}>
                    <div className="h-full bg-primary" style={{ width: `${Math.round(goal.progress * 100)}%` }} />
                  </div>
                ) : null}
                {goal.notes ? <p className="text-sm">{goal.notes}</p> : null}
                <details>
                  <summary className="cursor-pointer text-sm">Edit</summary>
                  <div className="mt-3">
                    <GoalForm
                      today={data.today}
                      initial={{
                        id: goal.id,
                        name: goal.name,
                        category: goal.category,
                        direction: goal.direction as "decrease",
                        startingValue: goal.startingValue ?? undefined,
                        targetValue: goal.targetValue ?? undefined,
                        currentValue: goal.currentValue ?? undefined,
                        unit: goal.unit,
                        startText: goal.startText,
                        targetText: goal.targetText,
                        startDate: goal.startDate,
                        targetDate: goal.targetDate ?? undefined,
                        status: goal.status as "active",
                        notes: goal.notes,
                      }}
                    />
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardHeader><CardTitle>New goal</CardTitle></CardHeader>
          <CardContent><GoalForm today={data.today} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
