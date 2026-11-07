import type { Food, Prisma } from "@prisma/client";
import { scaleNutrition, type MacroSnapshot } from "@/lib/calc";
import { prisma } from "@/lib/prisma";
import { fail, prismaMessage } from "@/lib/result";
import { foodFormSchema, logFoodSchema, recipeSchema } from "@/lib/validators";

function snapshot(food: Food, quantity: number, unit: string): MacroSnapshot {
  return scaleNutrition(
    {
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      gramsPerServing: food.gramsPerServing,
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      fiberG: food.fiberG,
      sugarG: food.sugarG,
      sodiumMg: food.sodiumMg,
      saturatedFatG: food.saturatedFatG,
      cholesterolMg: food.cholesterolMg,
      calciumMg: food.calciumMg,
      ironMg: food.ironMg,
      potassiumMg: food.potassiumMg,
      bcaaG: food.bcaaG,
    },
    quantity,
    unit,
  );
}

async function entryFor(date: string, mealType: string) {
  return prisma.mealEntry.upsert({
    where: { date_mealType: { date, mealType } },
    create: { date, mealType },
    update: {},
  });
}

function itemData(food: Food, quantity: number, unit: string, macros: MacroSnapshot, recipeId?: string) {
  return {
    foodId: food.id,
    recipeId: recipeId ?? null,
    name: food.name,
    brand: food.brand,
    quantity,
    unit,
    ...macros,
    hasSodium: food.hasSodium,
    fiberLessThan: food.fiberLessThan,
    isEstimate: food.isEstimate,
    preparation: food.preparation,
  };
}

export async function logFood(input: unknown) {
  const parsed = logFoodSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the portion.");
  const food = await prisma.food.findUnique({ where: { id: parsed.data.foodId } });
  if (!food) return fail("That food is no longer in your database.");
  try {
    const macros = snapshot(food, parsed.data.quantity, parsed.data.unit);
    const entry = await entryFor(parsed.data.date, parsed.data.mealType);
    await prisma.mealItem.create({
      data: { mealEntryId: entry.id, ...itemData(food, parsed.data.quantity, parsed.data.unit, macros) },
    });
    return { ok: true as const };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not log that food.");
  }
}

export async function updateMealItem(input: { id: string; quantity: number; unit: string }) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) return fail("Quantity must be greater than zero.");
  const item = await prisma.mealItem.findUnique({ where: { id: input.id } });
  if (!item) return fail("That entry is gone.");
  if (item.foodId) {
    const food = await prisma.food.findUnique({ where: { id: item.foodId } });
    if (food) {
      try {
        const macros = snapshot(food, input.quantity, input.unit);
        await prisma.mealItem.update({
          where: { id: item.id },
          data: { quantity: input.quantity, unit: input.unit, ...macros, isEstimate: food.isEstimate, hasSodium: food.hasSodium },
        });
        return { ok: true as const };
      } catch (error) {
        return fail(error instanceof Error ? error.message : "Could not rescale that entry.");
      }
    }
  }
  if (input.unit !== item.unit) {
    return fail("The original food was deleted. You can change the amount in the same unit, or delete the entry.");
  }
  const factor = input.quantity / item.quantity;
  await prisma.mealItem.update({
    where: { id: item.id },
    data: {
      quantity: input.quantity,
      calories: item.calories * factor,
      proteinG: item.proteinG * factor,
      carbsG: item.carbsG * factor,
      fatG: item.fatG * factor,
      fiberG: item.fiberG * factor,
      sugarG: item.sugarG * factor,
      sodiumMg: item.sodiumMg * factor,
    },
  });
  return { ok: true as const };
}

export async function deleteMealItem(id: string) {
  const item = await prisma.mealItem.findUnique({ where: { id } });
  if (!item) return { ok: true as const };
  await prisma.mealItem.delete({ where: { id } });
  const remaining = await prisma.mealItem.count({ where: { mealEntryId: item.mealEntryId } });
  if (remaining === 0) await prisma.mealEntry.delete({ where: { id: item.mealEntryId } });
  return { ok: true as const };
}

export async function updateMealNotes(input: { date: string; mealType: string; notes: string }) {
  const entry = await prisma.mealEntry.findUnique({
    where: { date_mealType: { date: input.date, mealType: input.mealType } },
  });
  if (!entry) return fail("Log a food in this meal before adding a note.");
  await prisma.mealEntry.update({ where: { id: entry.id }, data: { notes: input.notes.slice(0, 2000) } });
  return { ok: true as const };
}

async function copyItems(
  items: {
    foodId: string | null;
    name: string;
    brand: string;
    quantity: number;
    unit: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    sugarG: number;
    sodiumMg: number;
    hasSodium: boolean;
    isEstimate: boolean;
    preparation: string;
    recipeId?: string | null;
  }[],
  date: string,
  mealType: string,
) {
  const entry = await entryFor(date, mealType);
  for (const item of items) {
    if (item.foodId) {
      const food = await prisma.food.findUnique({ where: { id: item.foodId } });
      if (food) {
        try {
          const macros = snapshot(food, item.quantity, item.unit);
          await prisma.mealItem.create({
            data: {
              mealEntryId: entry.id,
              ...itemData(food, item.quantity, item.unit, macros, item.recipeId ?? undefined),
            },
          });
          continue;
        } catch {
          // Fall through and keep the original snapshot if the unit no longer converts.
        }
      }
    }
    await prisma.mealItem.create({
      data: {
        mealEntryId: entry.id,
        foodId: item.foodId,
        recipeId: item.recipeId ?? null,
        name: item.name,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        fiberG: item.fiberG,
        sugarG: item.sugarG,
        sodiumMg: item.sodiumMg,
        hasSodium: item.hasSodium,
        isEstimate: item.isEstimate,
        preparation: item.preparation,
      },
    });
  }
}

export async function copyMeal(input: { fromDate: string; toDate: string; mealType?: string }) {
  const meals = await prisma.mealEntry.findMany({
    where: { date: input.fromDate, ...(input.mealType ? { mealType: input.mealType } : {}) },
    include: { items: true },
  });
  if (meals.every((meal) => meal.items.length === 0)) return fail("Nothing was logged on that day to copy.");
  for (const meal of meals) {
    await copyItems(meal.items, input.toDate, meal.mealType);
  }
  return { ok: true as const };
}

export async function repeatMeal(input: { mealEntryId: string; date: string }) {
  const meal = await prisma.mealEntry.findUnique({
    where: { id: input.mealEntryId },
    include: { items: true },
  });
  if (!meal || meal.items.length === 0) return fail("That meal is empty.");
  await copyItems(meal.items, input.date, meal.mealType);
  return { ok: true as const };
}

export async function logSavedMeal(input: {
  savedMealId: string;
  date: string;
  mealType?: string;
  overrides?: { itemId: string; quantity: number; unit: string }[];
}) {
  const meal = await prisma.savedMeal.findUnique({
    where: { id: input.savedMealId },
    include: { items: { include: { food: true } } },
  });
  if (!meal) return fail("That template is gone.");
  const entry = await entryFor(input.date, input.mealType || meal.mealType);
  for (const item of meal.items) {
    const override = input.overrides?.find((row) => row.itemId === item.id);
    const quantity = override?.quantity ?? item.quantity;
    const unit = override?.unit ?? item.unit;
    try {
      const macros = snapshot(item.food, quantity, unit);
      await prisma.mealItem.create({
        data: { mealEntryId: entry.id, ...itemData(item.food, quantity, unit, macros) },
      });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not log that template.");
    }
  }
  return { ok: true as const };
}

export async function saveMealTemplate(input: { date: string; mealType: string; name: string }) {
  const name = input.name.trim();
  if (!name) return fail("Name the template.");
  const meal = await prisma.mealEntry.findUnique({
    where: { date_mealType: { date: input.date, mealType: input.mealType } },
    include: { items: true },
  });
  if (!meal || meal.items.length === 0) return fail("Log foods in this meal before saving it.");
  const missing = meal.items.filter((item) => !item.foodId);
  if (missing.length > 0) {
    return fail("Every food in the template needs to still exist in your food list.");
  }
  const saved = await prisma.savedMeal.create({
    data: {
      name,
      mealType: input.mealType,
      notes: meal.notes,
      items: {
        create: meal.items.map((item) => ({
          foodId: item.foodId as string,
          quantity: item.quantity,
          unit: item.unit,
        })),
      },
    },
  });
  return { ok: true as const, data: { id: saved.id } };
}

export async function deleteSavedMeal(id: string) {
  await prisma.savedMeal.delete({ where: { id } });
  return { ok: true as const };
}

export async function saveFood(input: unknown) {
  const parsed = foodFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the food.");
  const data = {
    name: parsed.data.name,
    brand: parsed.data.brand,
    servingSize: parsed.data.servingSize,
    servingUnit: parsed.data.servingUnit,
    gramsPerServing: parsed.data.gramsPerServing ?? parsed.data.servingSize,
    calories: parsed.data.calories,
    proteinG: parsed.data.proteinG,
    carbsG: parsed.data.carbsG,
    fatG: parsed.data.fatG,
    fiberG: parsed.data.fiberG,
    sugarG: parsed.data.sugarG,
    sodiumMg: parsed.data.sodiumMg,
    hasSodium: parsed.data.hasSodium,
    source: parsed.data.source,
    isEstimate: parsed.data.isEstimate,
    preparation: parsed.data.preparation,
    notes: parsed.data.notes,
  };
  try {
    if (parsed.data.id) {
      await prisma.food.update({ where: { id: parsed.data.id }, data });
    } else {
      await prisma.food.create({ data });
    }
    return { ok: true as const };
  } catch (error) {
    return fail(prismaMessage(error, "Could not save that food."));
  }
}

export async function deleteFood(id: string) {
  try {
    await prisma.food.delete({ where: { id } });
    return { ok: true as const };
  } catch (error) {
    return fail(prismaMessage(error, "Could not delete that food."));
  }
}

export async function toggleFavorite(id: string) {
  const food = await prisma.food.findUnique({ where: { id } });
  if (!food) return fail("That food is gone.");
  await prisma.food.update({ where: { id }, data: { isFavorite: !food.isFavorite } });
  return { ok: true as const };
}

export async function saveRecipe(input: unknown) {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the recipe.");
  const ingredients: Prisma.RecipeIngredientCreateWithoutRecipeInput[] = parsed.data.ingredients.map((item) => ({
    food: { connect: { id: item.foodId } },
    quantity: item.quantity,
    unit: item.unit,
  }));
  try {
    if (parsed.data.id) {
      await prisma.recipe.update({
        where: { id: parsed.data.id },
        data: {
          name: parsed.data.name,
          servings: parsed.data.servings,
          notes: parsed.data.notes,
          ingredients: { deleteMany: {}, create: ingredients },
        },
      });
    } else {
      await prisma.recipe.create({
        data: {
          name: parsed.data.name,
          servings: parsed.data.servings,
          notes: parsed.data.notes,
          ingredients: { create: ingredients },
        },
      });
    }
    return { ok: true as const };
  } catch (error) {
    return fail(prismaMessage(error, "Could not save that recipe."));
  }
}

export async function deleteRecipe(id: string) {
  await prisma.recipe.delete({ where: { id } });
  return { ok: true as const };
}

export async function logRecipe(input: { recipeId: string; date: string; mealType: string; servings: number }) {
  if (!Number.isFinite(input.servings) || input.servings <= 0) return fail("Servings must be greater than zero.");
  const recipe = await prisma.recipe.findUnique({
    where: { id: input.recipeId },
    include: { ingredients: { include: { food: true } } },
  });
  if (!recipe) return fail("That recipe is gone.");
  const entry = await entryFor(input.date, input.mealType);
  const scale = input.servings / recipe.servings;
  for (const ingredient of recipe.ingredients) {
    const quantity = ingredient.quantity * scale;
    try {
      const macros = snapshot(ingredient.food, quantity, ingredient.unit);
      await prisma.mealItem.create({
        data: {
          mealEntryId: entry.id,
          ...itemData(ingredient.food, quantity, ingredient.unit, macros, recipe.id),
        },
      });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not log that recipe.");
    }
  }
  return { ok: true as const };
}
