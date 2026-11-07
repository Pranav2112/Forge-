import { Suspense } from "react";
import { DeletePhoto, DeleteRow, MeasurementForm, PhotoForm } from "@/components/body/body-forms";
import { WeightLog } from "@/components/daily-log";
import { LineTrend } from "@/components/charts/charts";
import { EmptyState, PageHeader, ScreenFallback, SetupRequired } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lengthLabel, signedKg, weightLabel } from "@/lib/format";
import { getBody } from "@/lib/queries";

export const metadata = { title: "Body progress" };

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback label="Loading body progress" />}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const data = await getBody();
  if (!data.ready) return <SetupRequired />;
  const unit = data.settings.weightUnit;
  return (
    <div>
      <PageHeader eyebrow="Body" title="Progress" description="Weigh-ins and measurements are the only numbers on this chart. The baseline stays on your profile until you edit it." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Weight</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {data.latest ? (
              <>
                <p className="text-3xl font-semibold">{weightLabel(data.latest.value, unit)}</p>
                <p className="text-sm text-muted-foreground">
                  {signedKg(data.latest.value - data.profile.baselineWeightKg)} from {weightLabel(data.profile.baselineWeightKg, unit)}
                  {data.average7 != null ? ` · 7-day average ${weightLabel(data.average7, unit)}` : ""}
                  {data.weekly != null ? ` · about 7 days earlier ${signedKg(data.weekly)}` : ""}
                  {data.monthly != null ? ` · about 30 days earlier ${signedKg(data.monthly)}` : ""}
                </p>
                <LineTrend data={data.points} lines={[{ key: "kg", name: "Weight" }]} />
              </>
            ) : <EmptyState title="No weigh-ins" body="Log the first one. FORGE will not draw a chart from the baseline alone." />}
            <WeightLog date={data.today} unit={unit} previous={data.latest ? `${data.latest.date} · ${weightLabel(data.latest.value, unit)}` : undefined} />
            <div className="grid gap-1 text-sm">
              {data.weights.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2">
                  <span>{row.date} · {weightLabel(row.weightKg, unit)} {row.isRepresentative ? "" : "(extra)"} {row.notes}</span>
                  <DeleteRow id={row.id} kind="weight" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Measurements</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {data.waistPoints.length ? <LineTrend data={data.waistPoints} lines={[{ key: "cm", name: "Waist cm" }]} /> : <EmptyState title="No waist entries" body="The 37 inch baseline is on your profile, not on this chart." />}
            <MeasurementForm date={data.today} unit={data.settings.lengthUnit} />
            <div className="grid gap-2 text-sm">
              {data.measurements.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-2 rounded-xl border border-border px-3 py-2">
                  <div>
                    <p>{row.date}</p>
                    <p className="text-muted-foreground">
                      {row.waistCm != null ? `Waist ${lengthLabel(row.waistCm, data.settings.lengthUnit)} ` : ""}
                      {row.chestCm != null ? `Chest ${lengthLabel(row.chestCm, data.settings.lengthUnit)} ` : ""}
                      {row.bodyFatPercent != null ? `Body fat ${row.bodyFatPercent}% (${row.bodyFatMethod || "unspecified"})` : ""}
                    </p>
                  </div>
                  <DeleteRow id={row.id} kind="measurement" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Progress photos</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <PhotoForm date={data.today} enabled={data.photosEnabled} />
            {data.photos.length === 0 ? <EmptyState title="No photos" body="Front, side, and back photos stay in data/photos and are served only through a private route." /> : (
              <div className="grid gap-4 md:grid-cols-3">
                {data.photos.map((photo) => (
                  <figure key={photo.id} className="rounded-xl border border-border p-2">
                    {/* Private photo route, not a public image asset. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/photos/${photo.id}`} alt={`${photo.angle} progress photo ${photo.date}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
                    <figcaption className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{photo.date} · {photo.angle} {photo.notes ? `· ${photo.notes}` : ""}</span>
                      <DeletePhoto id={photo.id} />
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Private files</Badge>
              Compare two dates by opening them side by side in this grid.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
