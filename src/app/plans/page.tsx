import { Suspense } from "react";
import { PlanEditor } from "@/components/plans/plan-editor";
import { PageHeader, ScreenFallback, SetupRequired } from "@/components/bits";
import { getPlans } from "@/lib/queries";

export const metadata = { title: "Training plans" };

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback label="Loading plans" />}>
      <Plans />
    </Suspense>
  );
}

async function Plans() {
  const data = await getPlans();
  if (!data.ready) return <SetupRequired />;
  return (
    <div>
      <PageHeader eyebrow="Template" title={data.planName} description={`${data.planNotes} Completed workouts stay even when you edit this split.`} />
      <PlanEditor days={data.days} exercises={data.exercises} />
    </div>
  );
}
