"use client";

import { useState } from "react";
import { MEAL_TYPES } from "@/lib/constants";
import { saveRecipeAction } from "@/lib/actions";
import { useAction } from "@/components/use-action";
import { Field, NativeSelect } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FoodOption } from "@/components/nutrition/food-logger";

export function RecipeForm({ foods }: { foods: FoodOption[] }) {
  const { pending, run } = useAction();
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [foodId, setFoodId] = useState(foods[0]?.id ?? "");
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState("g");
  const [rows, setRows] = useState<{ foodId: string; quantity: number; unit: string; name: string }[]>([]);

  return (
    <div className="grid gap-3">
      <Field label="Recipe name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <Field label="Servings this recipe makes"><Input value={servings} onChange={(event) => setServings(event.target.value)} /></Field>
      <div className="grid gap-2 md:grid-cols-4">
        <NativeSelect value={foodId} onChange={(event) => setFoodId(event.target.value)} aria-label="Ingredient">
          {foods.map((food) => (
            <option key={food.id} value={food.id}>{food.name}</option>
          ))}
        </NativeSelect>
        <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label="Ingredient amount" />
        <Input value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Ingredient unit" />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const food = foods.find((item) => item.id === foodId);
            if (!food || !(Number(quantity) > 0)) return;
            setRows((current) => [...current, { foodId, quantity: Number(quantity), unit, name: food.name }]);
          }}
        >
          Add ingredient
        </Button>
      </div>
      <ul className="text-sm text-muted-foreground">
        {rows.map((row, index) => (
          <li key={`${row.foodId}-${index}`}>{row.quantity} {row.unit} {row.name}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Ingredient amounts are for the whole recipe. Logging asks how many servings you ate. {MEAL_TYPES.length} meal slots are available when you log it.</p>
      <Button
        type="button"
        disabled={pending || rows.length === 0}
        onClick={() =>
          run(
            () =>
              saveRecipeAction({
                name,
                servings: Number(servings),
                notes: "",
                ingredients: rows.map((row) => ({ foodId: row.foodId, quantity: row.quantity, unit: row.unit })),
              }),
            "Recipe saved",
          )
        }
      >
        Save recipe
      </Button>
    </div>
  );
}
