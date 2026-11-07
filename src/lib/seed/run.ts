import type { PrismaClient } from "@prisma/client";
import { todayKey } from "@/lib/dates";
import { EXERCISES, FOODS, PLAN_DAYS, PROTEIN_OATMEAL } from "@/lib/seed/catalog";

export async function seedIfEmpty(prisma: PrismaClient): Promise<{ seeded: boolean }> {
  const existing = await prisma.userProfile.findUnique({ where: { id: "default" } });
  if (existing) return { seeded: false };

  const today = todayKey("America/New_York");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.userProfile.create({
        data: {
          id: "default",
          name: "Pranav Auti",
          age: 23,
          sex: "Male",
          heightCm: 178,
          diet: "Lacto-vegetarian",
          allowedFoods: JSON.stringify([
            "Dairy",
            "Whey protein",
            "Tofu",
            "Soy",
            "Paneer",
            "Beans",
            "Grains",
            "Vegetables",
            "Fruits",
          ]),
          excludedFoods: JSON.stringify(["Eggs", "Meat", "Fish"]),
          baselineWeightKg: 96,
          baselineWaistCm: 37 * 2.54,
          abdominalDefinition: "None",
          timezone: "America/New_York",
        },
      });

      await tx.userSettings.create({
        data: {
          id: "default",
          weightUnit: "kg",
          lengthUnit: "cm",
          distanceUnit: "km",
          restTimerSeconds: 90,
        },
      });

      await tx.nutritionTarget.create({
        data: {
          effectiveFrom: today,
          calories: 2100,
          proteinG: 180,
          carbsG: 210,
          fatG: 60,
          fiberG: 30,
          steps: 9000,
          waterMl: 3000,
          notes: "Starting targets. Fiber at 30 g is an editable default, not a lab prescription. Change these any time; older days keep the target that was in effect then.",
        },
      });

      await tx.goal.createMany({
        data: [
          {
            name: "Weight reduction",
            category: "weight",
            direction: "decrease",
            startingValue: 96,
            targetValue: null,
            unit: "kg",
            startDate: today,
            targetDate: "2026-12-31",
            status: "active",
            notes: "Baseline is 96 kg. Set a target weight when you choose one. Logging a weigh-in does not rewrite this baseline.",
          },
          {
            name: "Waist reduction",
            category: "waist",
            direction: "decrease",
            startingValue: 37 * 2.54,
            targetValue: null,
            unit: "cm",
            startDate: today,
            targetDate: "2026-12-31",
            status: "active",
            notes: "Baseline is 37 in (93.98 cm). Set a target measurement when you choose one.",
          },
          {
            name: "Improved abdominal definition",
            category: "definition",
            direction: "qualitative",
            startText: "None",
            targetText: "Visible definition",
            startDate: today,
            targetDate: "2026-12-31",
            status: "active",
            notes: "Subjective. Update the note as photos and the mirror change. FORGE will not invent a body-fat number.",
          },
          {
            name: "Improved running performance",
            category: "running",
            direction: "improve",
            startDate: today,
            targetDate: "2026-12-31",
            status: "active",
            notes: "Set a pace or distance target after you have a few logged runs.",
          },
          {
            name: "Maintain strength during fat loss",
            category: "strength",
            direction: "maintain",
            startDate: today,
            targetDate: "2026-12-31",
            status: "active",
            notes: "Watch estimated 1RMs for bench, squat, and deadlift. Small dips during a deficit are information, not a command to slash calories.",
          },
          {
            name: "HYROX preparation",
            category: "hyrox",
            direction: "qualitative",
            startText: "Training",
            targetText: "Ready for a race effort",
            startDate: today,
            targetDate: "2026-12-31",
            status: "active",
            notes: "Station times and simulations are training records. They are not an official finish-time prediction.",
          },
        ],
      });

      await tx.food.createMany({
        data: FOODS.map((food) => ({
          name: food.name,
          brand: food.brand,
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
          hasSodium: food.hasSodium,
          source: food.source,
          isEstimate: food.isEstimate,
          isFavorite: food.isFavorite,
          preparation: food.preparation,
          notes: food.notes,
        })),
      });

      const foods = await tx.food.findMany();
      const foodByName = new Map(foods.map((food) => [food.name, food]));
      const keyToFood = new Map(
        FOODS.map((seed) => {
          const row = foodByName.get(seed.name);
          if (!row) throw new Error(`Missing seeded food ${seed.name}`);
          return [seed.key, row];
        }),
      );

      const meal = await tx.savedMeal.create({
        data: {
          name: PROTEIN_OATMEAL.name,
          mealType: PROTEIN_OATMEAL.mealType,
          notes: PROTEIN_OATMEAL.notes,
        },
      });
      await tx.savedMealItem.createMany({
        data: PROTEIN_OATMEAL.items.map((item) => {
          const food = keyToFood.get(item.key);
          if (!food) throw new Error(`Missing oatmeal ingredient ${item.key}`);
          return { savedMealId: meal.id, foodId: food.id, quantity: item.quantity, unit: item.unit };
        }),
      });

      const recipe = await tx.recipe.create({
        data: {
          name: PROTEIN_OATMEAL.name,
          servings: 1,
          notes: "One bowl. Same ingredients as the saved breakfast. Change whey between 32 g and 48 g when you log it.",
        },
      });
      await tx.recipeIngredient.createMany({
        data: PROTEIN_OATMEAL.items.map((item) => {
          const food = keyToFood.get(item.key);
          if (!food) throw new Error(`Missing recipe ingredient ${item.key}`);
          return { recipeId: recipe.id, foodId: food.id, quantity: item.quantity, unit: item.unit };
        }),
      });

      await tx.exercise.createMany({
        data: EXERCISES.map((exercise) => ({
          name: exercise.name,
          primaryMuscle: exercise.primaryMuscle,
          secondaryMuscles: JSON.stringify(exercise.secondaryMuscles),
          equipment: exercise.equipment,
          exerciseType: exercise.exerciseType,
          instructions: exercise.instructions,
          tracksLoad: exercise.tracksLoad,
          notes: exercise.notes ?? "",
        })),
      });

      const exercises = await tx.exercise.findMany();
      const exerciseByName = new Map(exercises.map((exercise) => [exercise.name, exercise]));

      const plan = await tx.trainingPlan.create({
        data: {
          name: "Foundation Split",
          isActive: true,
          notes: "Editable weekly template. Changing it does not delete workout history.",
        },
      });

      for (const day of PLAN_DAYS) {
        const created = await tx.trainingPlanDay.create({
          data: {
            planId: plan.id,
            dayOfWeek: day.dayOfWeek,
            name: day.name,
            focus: day.focus,
            notes: day.notes,
          },
        });
        if (day.exercises.length === 0) continue;
        await tx.plannedExercise.createMany({
          data: day.exercises.map((exercise, index) => {
            const row = exerciseByName.get(exercise.name);
            if (!row) throw new Error(`Missing exercise ${exercise.name}`);
            return {
              dayId: created.id,
              exerciseId: row.id,
              sortOrder: index,
              targetSets: exercise.targetSets,
              targetReps: exercise.targetReps,
              notes: exercise.notes ?? "",
            };
          }),
        });
      }
    });
  } catch (error) {
    const profile = await prisma.userProfile.findUnique({ where: { id: "default" } });
    if (profile) return { seeded: false };
    throw error;
  }

  return { seeded: true };
}
