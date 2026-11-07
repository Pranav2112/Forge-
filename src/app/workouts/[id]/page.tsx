import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SessionView } from "@/components/workouts/session-view";
import { ScreenFallback, SetupRequired } from "@/components/bits";
import { getWorkout } from "@/lib/queries";

export const metadata = { title: "Workout" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ScreenFallback label="Loading workout" />}>
      <Workout params={params} />
    </Suspense>
  );
}

async function Workout({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getWorkout(id);
  if (!data.ready) return <SetupRequired />;
  if (data.missing) notFound();
  return (
    <SessionView
      session={data.session}
      library={data.library}
      weightUnit={data.settings.weightUnit}
      restDefault={data.settings.restTimerSeconds}
    />
  );
}
