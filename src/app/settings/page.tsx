import { Suspense } from "react";
import { PasswordForm } from "@/components/auth/password-form";
import { BackupPanel, ProfileForm, TargetForm, UnitsForm } from "@/components/settings/settings-forms";
import { PageHeader, ScreenFallback, SetupRequired } from "@/components/bits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/queries";

export const metadata = { title: "Settings" };

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback label="Loading settings" />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const data = await getSettings();
  if (!data.ready) return <SetupRequired />;
  const user = await currentUser();
  const current = data.targets[0];
  return (
    <div>
      <PageHeader eyebrow="Settings" title="Profile, targets, backup" description="This copy is a single private account." />
      <div className="grid gap-4">
        {user ? (
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Signed in as {user.email}. The new password is sent to Supabase Auth and is not stored in FORGE.</CardDescription>
            </CardHeader>
            <CardContent><PasswordForm mode="change" email={user.email} /></CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Lacto-vegetarian defaults are editable. Eggs, meat, and fish start on the excluded list.</CardDescription></CardHeader>
          <CardContent><ProfileForm profile={data.profile} weightUnit={data.settings.weightUnit} lengthUnit={data.settings.lengthUnit} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Nutrition targets</CardTitle><CardDescription>A new effective date keeps older targets for older days. Targets under 1,200 kcal are rejected.</CardDescription></CardHeader>
          <CardContent>
            <TargetForm
              today={data.today}
              target={current ? { calories: current.calories, proteinG: current.proteinG, carbsG: current.carbsG, fatG: current.fatG, fiberG: current.fiberG, steps: current.steps, waterMl: current.waterMl, notes: current.notes } : null}
            />
            <ul className="mt-4 grid gap-1 text-xs text-muted-foreground">
              {data.targets.map((target) => (
                <li key={target.id}>From {target.effectiveFrom}: {target.calories} kcal, {target.proteinG} g protein</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Units and USDA</CardTitle></CardHeader>
          <CardContent><UnitsForm settings={data.settings} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Backup</CardTitle>
            <CardDescription>JSON is the full database. CSV files are nutrition, workouts, and body weight. The SQLite file itself is data/forge.db.</CardDescription>
          </CardHeader>
          <CardContent><BackupPanel /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Deployment</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <p>SQLite needs a persistent disk. A typical serverless host wipes the filesystem, so this file is the wrong database there.</p>
            <p>For a hosted copy, point DATABASE_URL at PostgreSQL, change the Prisma provider, run a migration, and add real authentication before the app is reachable. Progress photos stay disabled in production unless FORGE_PRIVATE_DEPLOYMENT=true.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
