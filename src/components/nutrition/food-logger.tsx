"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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

const GRAM_PRESETS = [50, 100, 150, 200];
const QUICK_MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;

export function FoodLogger({
  foods,
  date,
  recentIds,
  frequentIds = [],
}: {
  foods: FoodOption[];
  date: string;
  recentIds: string[];
  frequentIds?: string[];
}) {
  const { pending, error, run } = useAction();
  const desktopRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [foodId, setFoodId] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const suggestions = useMemo(
    () => (query.trim() ? rankFoods(foods, query, recentIds, frequentIds) : []),
    [foods, query, recentIds, frequentIds],
  );
  const quickFoods = useMemo(
    () => rankFoods(foods, "", recentIds, frequentIds),
    [foods, recentIds, frequentIds],
  );
  const food = foods.find((item) => item.id === foodId) ?? null;
  const mealLabel = MEAL_TYPES.find((meal) => meal.id === mealType)?.label ?? "Meal";

  function focusSearch() {
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    if (desktop) desktopRef.current?.focus();
    else document.getElementById("mobile-food-search")?.focus();
  }

  function choose(next: FoodOption) {
    setFoodId(next.id);
    setQuantity(String(next.servingSize));
    setUnit(next.servingUnit);
    setNotice("");
  }

  function resetSearch() {
    setQuery("");
    setFoodId("");
    setQuantity("");
    setUnit("g");
    window.setTimeout(focusSearch, 0);
  }

  function addFood(next?: { id: string; quantity: number; unit: string }) {
    const targetId = next?.id ?? foodId;
    const targetQuantity = next?.quantity ?? Number(quantity);
    const targetUnit = next?.unit ?? unit;
    if (!targetId || !(targetQuantity > 0) || pending) return;
    run(async () => {
      const result = await logFoodAction({
        date,
        mealType,
        foodId: targetId,
        quantity: targetQuantity,
        unit: targetUnit,
      });
      if (result.ok) {
        setNotice(`Added to ${mealLabel}`);
        resetSearch();
      }
      return result;
    }, `Added to ${mealLabel}`);
  }

  return (
    <div id="log-food" className="grid gap-4">
      <div className="grid gap-3 md:hidden">
        <MealChips mealType={mealType} onSelect={setMealType} />
        <Button type="button" className="h-12" onClick={() => setSheetOpen(true)}>Add food</Button>
        <QuickRow
          foods={quickFoods}
          pending={pending}
          onRepeat={(item) => addFood({ id: item.id, quantity: item.servingSize, unit: item.servingUnit })}
        />
      </div>
      <div className="hidden gap-3 md:grid">
        <MealChips mealType={mealType} onSelect={setMealType} />
        <FoodSearchField
          inputRef={desktopRef}
          query={query}
          suggestions={suggestions}
          activeId={foodId}
          onQuery={(value) => {
            setQuery(value);
            setFoodId("");
            setNotice("");
          }}
          onChoose={choose}
          onEscape={resetSearch}
        />
        <QuantityEditor
          food={food}
          quantity={quantity}
          unit={unit}
          pending={pending}
          onQuantity={setQuantity}
          onUnit={setUnit}
          onAdd={() => addFood()}
        />
      </div>
      {notice ? <p className="text-sm text-primary" role="status">{notice}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">{mealLabel} stays selected. Search clears after each food so the next one can be typed immediately.</p>
      {sheetOpen ? (
        <FoodSearchSheet
          mealType={mealType}
          mealLabel={mealLabel}
          query={query}
          suggestions={query.trim() ? suggestions : quickFoods}
          searching={query.trim().length > 0}
          food={food}
          quantity={quantity}
          unit={unit}
          pending={pending}
          notice={notice}
          onMeal={setMealType}
          onQuery={(value) => {
            setQuery(value);
            setFoodId("");
            setNotice("");
          }}
          onChoose={choose}
          onQuantity={setQuantity}
          onUnit={setUnit}
          onAdd={() => addFood()}
          onRepeat={(item) => addFood({ id: item.id, quantity: item.servingSize, unit: item.servingUnit })}
          onClearSelection={() => setFoodId("")}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </div>
  );
}

function MealChips({ mealType, onSelect }: { mealType: string; onSelect: (meal: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Meal">
      {MEAL_TYPES.filter((meal) => QUICK_MEALS.includes(meal.id as (typeof QUICK_MEALS)[number])).map((meal) => (
        <Button key={meal.id} type="button" size="sm" className="h-10" variant={mealType === meal.id ? "default" : "outline"} onClick={() => onSelect(meal.id)}>
          {meal.label}
        </Button>
      ))}
      <NativeSelect className="h-10 w-auto" value={QUICK_MEALS.includes(mealType as (typeof QUICK_MEALS)[number]) ? "" : mealType} onChange={(event) => onSelect(event.target.value)} aria-label="Other meal">
        <option value="" disabled>Other</option>
        {MEAL_TYPES.filter((meal) => !QUICK_MEALS.includes(meal.id as (typeof QUICK_MEALS)[number])).map((meal) => (
          <option key={meal.id} value={meal.id}>{meal.label}</option>
        ))}
      </NativeSelect>
    </div>
  );
}

function QuickRow({
  foods,
  pending,
  onRepeat,
}: {
  foods: FoodOption[];
  pending: boolean;
  onRepeat: (food: FoodOption) => void;
}) {
  if (foods.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {foods.slice(0, 8).map((item) => (
        <Button key={item.id} type="button" size="sm" variant="secondary" className="h-10" disabled={pending} onClick={() => onRepeat(item)}>
          {item.name}
        </Button>
      ))}
    </div>
  );
}

function FoodSearchField({
  inputRef,
  query,
  suggestions,
  activeId,
  onQuery,
  onChoose,
  onEscape,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  suggestions: FoodOption[];
  activeId: string;
  onQuery: (value: string) => void;
  onChoose: (food: FoodOption) => void;
  onEscape: () => void;
}) {
  return (
    <div className="grid gap-2">
      <Field label="Search your foods">
        <Input
          ref={inputRef}
          value={query}
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={query.trim().length > 0}
          aria-controls="food-suggestions"
          aria-label="Search foods"
          placeholder="Rice, poha, coffee, dal…"
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && suggestions[0] && !activeId) {
              event.preventDefault();
              onChoose(suggestions[0]);
            }
            if (event.key === "Escape") onEscape();
          }}
        />
      </Field>
      {query.trim() ? (
        <SuggestionList id="food-suggestions" suggestions={suggestions} query={query} activeId={activeId} onChoose={onChoose} />
      ) : null}
    </div>
  );
}

function SuggestionList({
  id,
  suggestions,
  query,
  activeId,
  onChoose,
  onRepeat,
}: {
  id: string;
  suggestions: FoodOption[];
  query: string;
  activeId: string;
  onChoose: (food: FoodOption) => void;
  onRepeat?: (food: FoodOption) => void;
}) {
  if (suggestions.length === 0) {
    if (!query.trim()) return <p className="text-sm text-muted-foreground">Favorites and recent foods will show here once you have logged some.</p>;
    return (
      <div className="rounded-xl border border-border px-3 py-3 text-sm">
        <p>No foods match “{query.trim()}”.</p>
        <Link className="mt-2 inline-flex min-h-11 items-center font-medium text-primary" href="/nutrition/foods">Create a custom food</Link>
      </div>
    );
  }
  return (
    <div id={id} data-food-suggestions role="listbox" aria-label="Food suggestions" className="grid max-h-72 gap-1 overflow-y-auto">
      {suggestions.map((item) => (
        <div key={item.id} className={`flex items-stretch gap-2 rounded-xl border ${item.id === activeId ? "border-primary bg-primary/10" : "border-border"}`}>
          <button
            type="button"
            role="option"
            aria-selected={item.id === activeId}
            className="flex min-h-12 flex-1 items-center justify-between gap-3 px-3 py-2 text-left text-sm"
            onClick={() => onChoose(item)}
          >
            <span>
              <span className="font-medium">{item.name}</span>
              {item.preparation ? <span className="text-muted-foreground"> · {item.preparation}</span> : null}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {item.servingSize} {item.servingUnit} · {Math.round(item.calories)} kcal · {grams(item.proteinG)} g protein
            </span>
          </button>
          {onRepeat ? (
            <Button type="button" variant="secondary" className="m-1 h-10" onClick={() => onRepeat(item)}>
              Add
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function QuantityEditor({
  food,
  quantity,
  unit,
  pending,
  onQuantity,
  onUnit,
  onAdd,
}: {
  food: FoodOption | null;
  quantity: string;
  unit: string;
  pending: boolean;
  onQuantity: (value: string) => void;
  onUnit: (value: string) => void;
  onAdd: () => void;
}) {
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
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[120px_140px_auto] md:items-end">
        <Field label="Amount">
          <Input inputMode="decimal" value={quantity} onChange={(event) => onQuantity(event.target.value)} aria-label="Amount" />
        </Field>
        <Field label="Unit">
          <NativeSelect value={unit} onChange={(event) => onUnit(event.target.value)} aria-label="Unit">
            {(food ? unitsFor(food) : ["g", "ml", "serving", "piece"]).map((choice) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </NativeSelect>
        </Field>
        <Button type="button" className="h-11" disabled={pending || !food || !(Number(quantity) > 0)} onClick={onAdd}>
          Add to meal
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {whey ? (
          <>
            <Button type="button" size="sm" variant={quantity === "32" ? "default" : "outline"} onClick={() => { onQuantity("32"); onUnit("g"); }}>1 scoop · 32 g</Button>
            <Button type="button" size="sm" variant={quantity === "48" ? "default" : "outline"} onClick={() => { onQuantity("48"); onUnit("g"); }}>1.5 scoops · 48 g</Button>
          </>
        ) : null}
        {(unit === "g" || unit === "ml") && !whey
          ? GRAM_PRESETS.map((preset) => (
              <Button key={preset} type="button" size="sm" className="h-10" variant={quantity === String(preset) ? "default" : "outline"} onClick={() => onQuantity(String(preset))}>
                {preset} {unit}
              </Button>
            ))
          : null}
      </div>
      {preview ? <p className="text-sm text-muted-foreground">{preview}</p> : null}
    </div>
  );
}

function FoodSearchSheet(props: {
  mealType: string;
  mealLabel: string;
  query: string;
  suggestions: FoodOption[];
  searching: boolean;
  food: FoodOption | null;
  quantity: string;
  unit: string;
  pending: boolean;
  notice: string;
  onMeal: (meal: string) => void;
  onQuery: (value: string) => void;
  onChoose: (food: FoodOption) => void;
  onQuantity: (value: string) => void;
  onUnit: (value: string) => void;
  onAdd: () => void;
  onRepeat: (food: FoodOption) => void;
  onClearSelection: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = panelRef.current;
    const apply = () => {
      if (!panel) return;
      const viewport = window.visualViewport;
      panel.style.top = `${viewport?.offsetTop ?? 0}px`;
      panel.style.height = `${viewport?.height ?? window.innerHeight}px`;
    };
    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    const id = window.setTimeout(() => document.getElementById("mobile-food-search")?.focus(), 30);
    return () => {
      window.clearTimeout(id);
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/40" onMouseDown={props.onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-label={`Add food to ${props.mealLabel}`}
        className="fixed inset-x-0 z-[71] flex h-dvh flex-col bg-background"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-base font-medium">Add to {props.mealLabel}</h2>
          <Button type="button" variant="outline" className="h-10" onClick={props.onClose}>Done</Button>
        </div>
        <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)_auto]">
          <div className="px-4 pt-3">
            <MealChips mealType={props.mealType} onSelect={props.onMeal} />
          </div>
          <div className="px-4 pt-3">
            <Input
              value={props.query}
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={!props.food}
              aria-controls="mobile-food-suggestions"
              id="mobile-food-search"
              aria-label="Search foods"
              placeholder="Type rice, poha, coffee…"
              onChange={(event) => props.onQuery(event.target.value)}
            />
          </div>
          <div className="min-h-0 overflow-y-auto px-4 py-3">
            {props.food ? (
              <div className="grid gap-3">
                <div className="rounded-xl border border-primary bg-primary/10 px-3 py-3">
                  <p className="font-medium">{props.food.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {props.food.preparation ? `${props.food.preparation} · ` : ""}
                    {props.food.servingSize} {props.food.servingUnit} · {Math.round(props.food.calories)} kcal · {grams(props.food.proteinG)} g protein
                  </p>
                  <button type="button" className="mt-2 min-h-11 text-sm font-medium text-primary" onClick={props.onClearSelection}>
                    Choose a different food
                  </button>
                </div>
                <QuantityEditor
                  food={props.food}
                  quantity={props.quantity}
                  unit={props.unit}
                  pending={props.pending}
                  onQuantity={props.onQuantity}
                  onUnit={props.onUnit}
                  onAdd={props.onAdd}
                />
              </div>
            ) : (
              <SuggestionList
                id="mobile-food-suggestions"
                suggestions={props.suggestions}
                query={props.searching ? props.query : ""}
                activeId=""
                onChoose={props.onChoose}
                onRepeat={props.searching ? undefined : props.onRepeat}
              />
            )}
            {props.notice ? <p className="mt-3 text-sm text-primary" role="status">{props.notice}</p> : null}
          </div>
          <div className="border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button type="button" className="h-12 w-full" disabled={props.pending || !props.food || !(Number(props.quantity) > 0)} onClick={props.onAdd}>
              Add to meal
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
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
