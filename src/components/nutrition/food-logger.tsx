"use client";

import { useMemo, useRef, useState } from "react";
import { rankFoods } from "@/lib/food-rank";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { scaleNutrition } from "@/lib/calc";
import { MEAL_TYPES } from "@/lib/constants";
import { grams, kcal } from "@/lib/format";
import { foodFormSchema } from "@/lib/validators";
import { logFoodAction, saveFoodAction } from "@/lib/actions";
import { useAction } from "@/components/use-action";
import { Field, NativeSelect } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type FoodOption = {
  id: string;
  name: string;
  brand: string;
  servingSize: number;
  servingUnit: string;
  gramsPerServing: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  hasSodium: boolean;
  source: string;
  isEstimate: boolean;
  isFavorite: boolean;
  preparation: string;
  notes: string;
  aliases?: string;
};

function unitsFor(food: FoodOption) {
  const units = new Set<string>([food.servingUnit, "serving"]);
  if (food.gramsPerServing) units.add(food.servingUnit === "ml" ? "ml" : "g");
  if (food.servingUnit !== "g" && food.gramsPerServing) units.add("g");
  return [...units];
}

const GRAM_PRESETS = [25, 50, 100, 150, 200];

export function FoodLogger({
  foods,
  date,
  recentIds,
}: {
  foods: FoodOption[];
  date: string;
  recentIds: string[];
}) {
  const { pending, error, run } = useAction();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [foodId, setFoodId] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");

  const results = useMemo(() => rankFoods(foods, query, recentIds), [foods, query, recentIds]);
  const food = foods.find((item) => item.id === foodId) ?? null;
  const mealLabel = MEAL_TYPES.find((meal) => meal.id === mealType)?.label ?? "Meal";
  const whey = food ? /whey/i.test(`${food.name} ${food.aliases ?? ""}`) : false;

  let preview: string | null = null;
  if (food && Number(quantity) > 0) {
    try {
      const scaled = scaleNutrition(food, Number(quantity), unit);
      const fiber = food.notes.includes("less than") && unit === "g" && food.servingSize > 0
        ? ` · fiber < ${grams((food.fiberG * Number(quantity)) / food.servingSize)} g`
        : "";
      preview = `${kcal(scaled.calories)} kcal · ${grams(scaled.proteinG)} g protein · ${grams(scaled.carbsG)} g carbs · ${grams(scaled.fatG)} g fat${fiber}${food.isEstimate ? " · estimated" : ""}`;
    } catch (caught) {
      preview = caught instanceof Error ? caught.message : "That unit does not fit this food.";
    }
  }

  function choose(next: FoodOption) {
    setFoodId(next.id);
    setQuantity(String(next.servingSize));
    setUnit(next.servingUnit);
  }

  function resetSearch() {
    setQuery("");
    setFoodId("");
    setQuantity("");
    setUnit("g");
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (!coarse) searchRef.current?.focus();
  }

  function addFood() {
    if (!food) return;
    run(async () => {
      const result = await logFoodAction({ date, mealType, foodId, quantity: Number(quantity), unit });
      if (result.ok) resetSearch();
      return result;
    }, "Food logged");
  }

  return (
    <div id="log-food" className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_160px_120px_140px_auto] md:items-end">
        <Field label="Search your foods">
          <div className="flex gap-2">
            <Input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setFoodId("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results[0] && !food) {
                  event.preventDefault();
                  choose(results[0]);
                }
                if (event.key === "Escape") resetSearch();
              }}
              placeholder="Rice, dal, paneer, whey…"
              aria-label="Search foods"
            />
            {query ? (
              <Button type="button" variant="outline" onClick={() => { setQuery(""); setFoodId(""); }} aria-label="Clear search">
                Clear
              </Button>
            ) : null}
          </div>
        </Field>
        <Field label="Meal">
          <NativeSelect value={mealType} onChange={(event) => setMealType(event.target.value)}>
            {MEAL_TYPES.map((meal) => (
              <option key={meal.id} value={meal.id}>{meal.label}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Amount">
          <Input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label="Amount" />
        </Field>
        <Field label="Unit">
          <NativeSelect value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Unit">
            {(food ? unitsFor(food) : ["g", "ml", "serving", "piece"]).map((choice) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </NativeSelect>
        </Field>
        <Button type="button" className="h-11" disabled={pending || !food || !(Number(quantity) > 0)} onClick={addFood}>
          Add food
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {results.filter((item) => item.isFavorite || recentIds.includes(item.id)).slice(0, 8).map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              choose(item);
              run(async () => {
                const result = await logFoodAction({
                  date,
                  mealType,
                  foodId: item.id,
                  quantity: item.servingSize,
                  unit: item.servingUnit,
                });
                if (result.ok) resetSearch();
                return result;
              }, `${item.name} logged`);
            }}
          >
            {item.name}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {whey ? (
          <>
            <Button type="button" size="sm" variant={quantity === "32" ? "default" : "outline"} onClick={() => { setQuantity("32"); setUnit("g"); }}>1 scoop · 32 g</Button>
            <Button type="button" size="sm" variant={quantity === "48" ? "default" : "outline"} onClick={() => { setQuantity("48"); setUnit("g"); }}>1.5 scoops · 48 g</Button>
          </>
        ) : null}
        {(unit === "g" || unit === "ml") && !whey
          ? GRAM_PRESETS.map((preset) => (
              <Button key={preset} type="button" size="sm" variant={quantity === String(preset) ? "default" : "outline"} onClick={() => setQuantity(String(preset))}>
                {preset} {unit}
              </Button>
            ))
          : null}
      </div>
      {preview ? <p className="text-sm text-muted-foreground">{preview}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-2">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No foods match. Create one in the food library.</p>
        ) : (
          results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => choose(item)}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${item.id === foodId ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
            >
              <span>
                <span className="font-medium">{item.name}</span>
                {item.brand ? <span className="text-muted-foreground"> · {item.brand}</span> : null}
                {item.preparation ? <span className="text-muted-foreground"> · {item.preparation}</span> : null}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(item.calories)} kcal · {grams(item.proteinG)} g protein / {item.servingSize} {item.servingUnit}
              </span>
            </button>
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">{mealLabel} stays selected after you add a food. Search clears so the next food can be typed immediately.</p>
    </div>
  );
}

export function FoodForm({ initial }: { initial?: FoodOption }) {
  const { pending, run } = useAction();
  const form = useForm({
    resolver: zodResolver(foodFormSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          brand: initial.brand,
          servingSize: initial.servingSize,
          servingUnit: initial.servingUnit,
          gramsPerServing: initial.gramsPerServing,
          calories: initial.calories,
          proteinG: initial.proteinG,
          carbsG: initial.carbsG,
          fatG: initial.fatG,
          fiberG: initial.fiberG,
          sugarG: initial.sugarG,
          sodiumMg: initial.sodiumMg,
          hasSodium: initial.hasSodium,
          source: initial.source,
          isEstimate: initial.isEstimate,
          preparation: initial.preparation,
          notes: initial.notes,
        }
      : {
          name: "",
          brand: "",
          servingSize: 100,
          servingUnit: "g",
          gramsPerServing: 100,
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
          fiberG: 0,
          sugarG: 0,
          sodiumMg: 0,
          hasSodium: false,
          source: "",
          isEstimate: true,
          preparation: "",
          notes: "",
        },
  });

  return (
    <form
      className="grid gap-3"
      onSubmit={form.handleSubmit((values) =>
        run(() => saveFoodAction(initial ? { ...values, id: initial.id } : values), initial ? "Food updated" : "Food saved"),
      )}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name"><Input {...form.register("name")} /></Field>
        <Field label="Brand"><Input {...form.register("brand")} /></Field>
        <Field label="Serving size"><Input type="number" step="any" {...form.register("servingSize", { valueAsNumber: true })} /></Field>
        <Field label="Serving unit" hint="g, ml, or piece. Dry and cooked foods should be separate entries.">
          <Input {...form.register("servingUnit")} />
        </Field>
        <Field label="Grams in one serving" hint="Used when you log by weight. For milk, 100 ml can stay 100.">
          <Input type="number" step="any" {...form.register("gramsPerServing", { setValueAs: (value) => (value === "" ? null : Number(value)) })} />
        </Field>
        <Field label="Preparation"><Input placeholder="dry, cooked, raw" {...form.register("preparation")} /></Field>
        <Field label="Calories"><Input type="number" step="any" {...form.register("calories", { valueAsNumber: true })} /></Field>
        <Field label="Protein (g)"><Input type="number" step="any" {...form.register("proteinG", { valueAsNumber: true })} /></Field>
        <Field label="Carbs (g)"><Input type="number" step="any" {...form.register("carbsG", { valueAsNumber: true })} /></Field>
        <Field label="Fat (g)"><Input type="number" step="any" {...form.register("fatG", { valueAsNumber: true })} /></Field>
        <Field label="Fiber (g)"><Input type="number" step="any" {...form.register("fiberG", { valueAsNumber: true })} /></Field>
        <Field label="Sugar (g)"><Input type="number" step="any" {...form.register("sugarG", { valueAsNumber: true })} /></Field>
        <Field label="Sodium (mg)"><Input type="number" step="any" {...form.register("sodiumMg", { valueAsNumber: true })} /></Field>
        <Field label="Source"><Input {...form.register("source")} placeholder="USDA, package label, estimate" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("isEstimate")} />
        These numbers are an estimate
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("hasSodium")} />
        Sodium was actually recorded
      </label>
      <Field label="Notes"><Textarea {...form.register("notes")} /></Field>
      {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
      {form.formState.errors.source ? <p className="text-sm text-destructive">{form.formState.errors.source.message}</p> : null}
      <Button type="submit" disabled={pending}>{initial ? "Save changes" : "Create food"}</Button>
    </form>
  );
}
