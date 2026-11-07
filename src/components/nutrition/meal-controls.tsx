"use client";

import { useState } from "react";
import { MEAL_TYPES, mealLabel } from "@/lib/constants";
import { grams, kcal } from "@/lib/format";
import {
  copyMealAction,
  deleteMealItemAction,
  deleteSavedMealAction,
  logRecipeAction,
  logSavedMealAction,
  repeatMealAction,
  logFoodAction,
  saveMealTemplateAction,
  updateMealItemAction,
  updateMealNotesAction,
} from "@/lib/actions";
import { useAction } from "@/components/use-action";
import { Field, NativeSelect } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = {
  id: string;
  foodId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  isEstimate: boolean;
  preparation: string;
};

export function MealList({
  meals,
  date,
}: {
  meals: { id: string; mealType: string; notes: string; items: Item[] }[];
  date: string;
}) {
  const { pending, run } = useAction();
  return (
    <div className="grid gap-4">
      {MEAL_TYPES.map((meal) => {
        const entry = meals.find((row) => row.mealType === meal.id);
        const items = entry?.items ?? [];
        const calories = items.reduce((sum, item) => sum + item.calories, 0);
        const protein = items.reduce((sum, item) => sum + item.proteinG, 0);
        return (
          <section key={meal.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{meal.label}</h2>
              <p className="text-sm tabular-nums text-muted-foreground">
                {items.length ? `${kcal(calories)} kcal · ${grams(protein)} g protein` : "Nothing logged"}
              </p>
            </div>
            <div className="grid gap-2">
              {items.map((item) => (
                <MealItemRow key={item.id} item={item} date={date} mealType={meal.id} pending={pending} run={run} />
              ))}
            </div>
            {entry ? (
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  run(() => updateMealNotesAction({ date, mealType: meal.id, notes: String(data.get("notes") ?? "") }), "Note saved");
                }}
              >
                <Input name="notes" defaultValue={entry.notes} placeholder="Meal note" className="max-w-md" />
                <Button type="submit" variant="outline" disabled={pending}>Save note</Button>
              </form>
            ) : null}
            <TemplateSave date={date} mealType={meal.id} disabled={!items.length || pending} />
          </section>
        );
      })}
    </div>
  );
}

function MealItemRow({
  item,
  date,
  mealType,
  pending,
  run,
}: {
  item: Item;
  date: string;
  mealType: string;
  pending: boolean;
  run: ReturnType<typeof useAction>["run"];
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  return (
    <div className="grid gap-2 rounded-xl bg-muted/60 p-3 md:grid-cols-[1fr_90px_110px_auto_auto_auto] md:items-center">
      <div>
        <p className="font-medium">
          {item.name}
          {item.preparation ? <span className="font-normal text-muted-foreground"> · {item.preparation}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {kcal(item.calories)} kcal · {grams(item.proteinG)} P · {grams(item.carbsG)} C · {grams(item.fatG)} F · {grams(item.fiberG)} fiber
          {item.isEstimate ? " · estimate" : ""}
        </p>
      </div>
      <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label={`Amount for ${item.name}`} />
      <Input value={unit} onChange={(event) => setUnit(event.target.value)} aria-label={`Unit for ${item.name}`} />
      <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => updateMealItemAction({ id: item.id, quantity: Number(quantity), unit }), "Updated")}>
        Update
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending || !item.foodId}
        onClick={() =>
          item.foodId
            ? run(() => logFoodAction({ date, mealType, foodId: item.foodId, quantity: Number(quantity), unit }), "Copied")
            : undefined
        }
      >
        Copy
      </Button>
      <Button type="button" variant="destructive" disabled={pending} onClick={() => run(() => deleteMealItemAction(item.id), "Removed")}>
        Delete
      </Button>
    </div>
  );
}

function TemplateSave({ date, mealType, disabled }: { date: string; mealType: string; disabled: boolean }) {
  const { pending, run } = useAction();
  const [name, setName] = useState("");
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={`Save ${mealLabel(mealType)} as a template`} className="max-w-xs" />
      <Button type="button" variant="secondary" disabled={disabled || pending || !name.trim()} onClick={() => run(() => saveMealTemplateAction({ date, mealType, name }), "Template saved")}>
        Save template
      </Button>
    </div>
  );
}

export function DayTools({
  date,
  today,
  savedMeals,
  recipes,
  frequent,
}: {
  date: string;
  today: string;
  savedMeals: {
    id: string;
    name: string;
    mealType: string;
    notes: string;
    items: { id: string; name: string; quantity: number; unit: string; isEstimate: boolean }[];
  }[];
  recipes: { id: string; name: string; servings: number; calories: number; proteinG: number; notes: string }[];
  frequent: { id: string; count: number; mealType: string; names: string[] }[];
}) {
  const { pending, run } = useAction();
  const yesterday = shift(date, -1);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => copyMealAction({ fromDate: yesterday, toDate: date }), "Copied yesterday")}>
          Copy yesterday
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => copyMealAction({ fromDate: date, toDate: today === date ? shift(date, 1) : today }), "Meal copied")}>
          Copy this day forward
        </Button>
      </div>
      <div className="grid gap-3">
        {savedMeals.map((meal) => (
          <SavedMealCard key={meal.id} meal={meal} date={date} pending={pending} run={run} />
        ))}
      </div>
      {recipes.length ? (
        <div className="grid gap-3">
          {recipes.map((recipe) => (
            <RecipeLog key={recipe.id} recipe={recipe} date={date} pending={pending} run={run} />
          ))}
        </div>
      ) : null}
      {frequent.length ? (
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">Logged more than once recently</h3>
          {frequent.map((meal) => (
            <div key={meal.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <span>{meal.names.join(", ")} · {meal.count} times</span>
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => repeatMealAction({ mealEntryId: meal.id, date }), "Meal logged again")}>
                Log again
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SavedMealCard({
  meal,
  date,
  pending,
  run,
}: {
  meal: {
    id: string;
    name: string;
    mealType: string;
    notes: string;
    items: { id: string; name: string; quantity: number; unit: string; isEstimate: boolean }[];
  };
  date: string;
  pending: boolean;
  run: ReturnType<typeof useAction>["run"];
}) {
  const whey = meal.items.find((item) => item.name.toLowerCase().includes("whey"));
  const [scoops, setScoops] = useState(whey && whey.quantity >= 40 ? "1.5" : "1");
  const [mealType, setMealType] = useState(meal.mealType);
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{meal.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{meal.notes}</p>
          <ul className="mt-2 text-sm text-muted-foreground">
            {meal.items.map((item) => (
              <li key={item.id}>
                {item.quantity} {item.unit} {item.name}
                {item.isEstimate ? " (estimate)" : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid w-full gap-2 sm:w-56">
          {whey ? (
            <Field label="Whey" hint="1 scoop is 32 g. 1.5 scoops is 48 g.">
              <NativeSelect value={scoops} onChange={(event) => setScoops(event.target.value)}>
                <option value="1">1 scoop · 32 g</option>
                <option value="1.5">1.5 scoops · 48 g</option>
              </NativeSelect>
            </Field>
          ) : null}
          <NativeSelect value={mealType} onChange={(event) => setMealType(event.target.value)} aria-label="Meal for template">
            {MEAL_TYPES.map((type) => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </NativeSelect>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  logSavedMealAction({
                    savedMealId: meal.id,
                    date,
                    mealType,
                    overrides: whey
                      ? [{ itemId: whey.id, quantity: scoops === "1" ? 32 : 48, unit: "g" }]
                      : undefined,
                  }),
                "Template logged",
              )
            }
          >
            Log {meal.name}
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => run(() => deleteSavedMealAction(meal.id), "Template deleted")}>
            Delete template
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecipeLog({
  recipe,
  date,
  pending,
  run,
}: {
  recipe: { id: string; name: string; servings: number; calories: number; proteinG: number; notes: string };
  date: string;
  pending: boolean;
  run: ReturnType<typeof useAction>["run"];
}) {
  const [servings, setServings] = useState(String(recipe.servings));
  const [mealType, setMealType] = useState("breakfast");
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-medium">{recipe.name}</h3>
          <p className="text-sm text-muted-foreground">
            Full recipe is about {kcal(recipe.calories)} kcal and {grams(recipe.proteinG)} g protein for {recipe.servings} serving{recipe.servings === 1 ? "" : "s"}. Logged meals keep a snapshot.
          </p>
          {recipe.notes ? <p className="mt-1 text-xs text-muted-foreground">{recipe.notes}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input className="w-24" value={servings} onChange={(event) => setServings(event.target.value)} aria-label="Servings" />
          <NativeSelect className="w-40" value={mealType} onChange={(event) => setMealType(event.target.value)} aria-label="Recipe meal">
            {MEAL_TYPES.map((meal) => (
              <option key={meal.id} value={meal.id}>{meal.label}</option>
            ))}
          </NativeSelect>
          <Button type="button" disabled={pending} onClick={() => run(() => logRecipeAction({ recipeId: recipe.id, date, mealType, servings: Number(servings) }), "Recipe logged")}>
            Log recipe
          </Button>
        </div>
      </div>
    </div>
  );
}

function shift(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function EstimateBadge({ estimate }: { estimate: boolean }) {
  return estimate ? <Badge variant="outline">Estimate</Badge> : null;
}
