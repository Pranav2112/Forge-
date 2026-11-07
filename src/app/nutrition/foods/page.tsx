import { Suspense } from "react";
import { FoodForm } from "@/components/nutrition/food-logger";
import { ExternalSearch } from "@/components/nutrition/external-search";
import { RecipeForm } from "@/components/nutrition/recipe-form";
import { FoodActions } from "@/components/nutrition/food-actions";
import { PageHeader, ScreenFallback, SetupRequired } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFoodLibrary } from "@/lib/queries";

export const metadata = { title: "Foods" };

export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback label="Loading foods" />}>
      <Foods />
    </Suspense>
  );
}

async function Foods() {
  const data = await getFoodLibrary();
  if (!data.ready) return <SetupRequired />;
  return (
    <div>
      <PageHeader eyebrow="Library" title="Foods" description="Dry, cooked, and raw weights are separate foods. Estimated rows stay marked until you replace them with a label." />
      <div className="grid gap-4">
        {data.foods.map((food) => (
          <Card key={food.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {food.name}
                {food.isEstimate ? <Badge variant="outline">Estimate</Badge> : <Badge variant="secondary">Recorded source</Badge>}
                {food.isFavorite ? <Badge>Favorite</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p>
                {food.brand ? `${food.brand} · ` : ""}
                {food.servingSize} {food.servingUnit}
                {food.preparation ? ` · ${food.preparation}` : ""} · {Math.round(food.calories)} kcal · {food.proteinG} P · {food.carbsG} C · {food.fatG} F
              </p>
              <p className="text-muted-foreground">{food.source}</p>
              {food.notes ? <p className="text-muted-foreground">{food.notes}</p> : null}
              <FoodActions id={food.id} favorite={food.isFavorite} />
              <details>
                <summary className="cursor-pointer text-sm">Edit</summary>
                <div className="mt-3"><FoodForm initial={food} /></div>
              </details>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader><CardTitle>New food</CardTitle></CardHeader>
          <CardContent><FoodForm /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Outside databases</CardTitle></CardHeader>
          <CardContent><ExternalSearch usdaConfigured={data.usdaConfigured} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>New recipe</CardTitle></CardHeader>
          <CardContent><RecipeForm foods={data.foods} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
