"use server";

import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { refreshApp } from "@/lib/refresh";
import { fail } from "@/lib/result";
import { buildBackup, importBackup, nutritionCsv, weightCsv, workoutCsv } from "@/lib/backup";
import { searchOpenFoodFacts, searchUsda, type ExternalFood } from "@/lib/food-search";
import { saveFood } from "@/lib/services/nutrition";
import * as nutrition from "@/lib/services/nutrition";
import * as training from "@/lib/services/training";
import * as body from "@/lib/services/body";
import { seedIfEmpty } from "@/lib/seed/run";

async function done<T>(result: T): Promise<T> {
  if (typeof result === "object" && result && "ok" in result && (result as { ok: boolean }).ok) {
    refreshApp();
  }
  return result;
}

async function ready() {
  await seedIfEmpty(prisma);
}

export async function logFoodAction(input: unknown) {
  await ready();
  return done(await nutrition.logFood(input));
}

export async function updateMealItemAction(input: { id: string; quantity: number; unit: string }) {
  await ready();
  return done(await nutrition.updateMealItem(input));
}

export async function deleteMealItemAction(id: string) {
  await ready();
  return done(await nutrition.deleteMealItem(id));
}

export async function updateMealNotesAction(input: { date: string; mealType: string; notes: string }) {
  await ready();
  return done(await nutrition.updateMealNotes(input));
}

export async function copyMealAction(input: { fromDate: string; toDate: string; mealType?: string }) {
  await ready();
  return done(await nutrition.copyMeal(input));
}

export async function repeatMealAction(input: { mealEntryId: string; date: string }) {
  await ready();
  return done(await nutrition.repeatMeal(input));
}

export async function logSavedMealAction(input: {
  savedMealId: string;
  date: string;
  mealType?: string;
  overrides?: { itemId: string; quantity: number; unit: string }[];
}) {
  await ready();
  return done(await nutrition.logSavedMeal(input));
}

export async function saveMealTemplateAction(input: { date: string; mealType: string; name: string }) {
  await ready();
  return done(await nutrition.saveMealTemplate(input));
}

export async function deleteSavedMealAction(id: string) {
  await ready();
  return done(await nutrition.deleteSavedMeal(id));
}

export async function saveFoodAction(input: unknown) {
  await ready();
  return done(await nutrition.saveFood(input));
}

export async function deleteFoodAction(id: string) {
  await ready();
  return done(await nutrition.deleteFood(id));
}

export async function toggleFavoriteAction(id: string) {
  await ready();
  return done(await nutrition.toggleFavorite(id));
}

export async function saveRecipeAction(input: unknown) {
  await ready();
  return done(await nutrition.saveRecipe(input));
}

export async function deleteRecipeAction(id: string) {
  await ready();
  return done(await nutrition.deleteRecipe(id));
}

export async function logRecipeAction(input: { recipeId: string; date: string; mealType: string; servings: number }) {
  await ready();
  return done(await nutrition.logRecipe(input));
}

export async function importExternalFoodAction(food: ExternalFood) {
  await ready();
  const mapped = {
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
    preparation: food.preparation,
    notes: food.notes,
  };
  return done(await saveFood(mapped));
}

export async function searchOffAction(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return fail("Type at least 2 characters.");
  try {
    const foods = await searchOpenFoodFacts(trimmed);
    if (foods.length === 0) return fail("No Open Food Facts results had calories, protein, carbs, and fat.");
    return { ok: true as const, data: foods };
  } catch {
    return fail("Open Food Facts could not be reached. You can still create the food manually.");
  }
}

export async function searchUsdaAction(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return fail("Type at least 2 characters.");
  const settings = await prisma.userSettings.findUnique({ where: { id: "default" } });
  const key = settings?.usdaApiKey || process.env.USDA_API_KEY || "";
  if (!key) return fail("Add a free USDA API key in Settings to search FoodData Central.");
  try {
    const foods = await searchUsda(trimmed, key);
    if (foods.length === 0) {
      return fail("No Foundation or SR Legacy foods had a complete per-100 g profile. Branded USDA records are skipped so portions are not guessed.");
    }
    return { ok: true as const, data: foods };
  } catch {
    return fail("USDA FoodData Central could not be reached.");
  }
}

export async function startWorkoutAction(input: { date: string; planDayId?: string | null; name?: string; repeatFromId?: string | null }) {
  await ready();
  return done(await training.startWorkout(input));
}

export async function setWorkoutStatusAction(input: { id: string; action: "pause" | "resume" | "finish"; notes?: string }) {
  await ready();
  return done(await training.setWorkoutStatus(input));
}

export async function updateWorkoutMetaAction(input: { id: string; name?: string; notes?: string }) {
  await ready();
  return done(await training.updateWorkoutMeta(input));
}

export async function addExerciseToWorkoutAction(input: { sessionId: string; exerciseId: string }) {
  await ready();
  return done(await training.addExerciseToWorkout(input));
}

export async function removeWorkoutExerciseAction(id: string) {
  await ready();
  return done(await training.removeWorkoutExercise(id));
}

export async function addSetAction(input: unknown) {
  await ready();
  return done(await training.addSet(input));
}

export async function deleteSetAction(id: string) {
  await ready();
  return done(await training.deleteSet(id));
}

export async function deleteWorkoutAction(id: string) {
  await ready();
  return done(await training.deleteWorkout(id));
}

export async function saveExerciseAction(input: Parameters<typeof training.saveExercise>[0]) {
  await ready();
  return done(await training.saveExercise(input));
}

export async function updatePlanDayAction(input: { id: string; name: string; focus: string; notes: string }) {
  await ready();
  return done(await training.updatePlanDay(input));
}

export async function addPlannedExerciseAction(input: {
  dayId: string;
  exerciseId: string;
  targetSets: number | null;
  targetReps: string;
  notes: string;
}) {
  await ready();
  return done(await training.addPlannedExercise(input));
}

export async function updatePlannedExerciseAction(input: {
  id: string;
  targetSets: number | null;
  targetReps: string;
  notes: string;
}) {
  await ready();
  return done(await training.updatePlannedExercise(input));
}

export async function removePlannedExerciseAction(id: string) {
  await ready();
  return done(await training.removePlannedExercise(id));
}

export async function logCardioAction(input: unknown) {
  await ready();
  return done(await training.logCardio(input));
}

export async function deleteCardioAction(id: string) {
  await ready();
  return done(await training.deleteCardio(id));
}

export async function saveProfileAction(input: unknown) {
  await ready();
  return done(await body.saveProfile(input));
}

export async function saveTargetAction(input: unknown) {
  await ready();
  return done(await body.saveTarget(input));
}

export async function saveSettingsAction(input: unknown) {
  await ready();
  return done(await body.saveSettings(input));
}

export async function logWeightAction(input: unknown) {
  await ready();
  return done(await body.logWeight(input));
}

export async function deleteWeightAction(id: string) {
  await ready();
  return done(await body.deleteWeight(id));
}

export async function logMeasurementAction(input: unknown) {
  await ready();
  return done(await body.logMeasurement(input));
}

export async function deleteMeasurementAction(id: string) {
  await ready();
  return done(await body.deleteMeasurement(id));
}

export async function logWaterAction(input: { date: string; amountMl: number }) {
  await ready();
  return done(await body.logWater(input));
}

export async function setStepsAction(input: { date: string; steps: number }) {
  await ready();
  return done(await body.setSteps(input));
}

export async function addStepsAction(input: { date: string; steps: number }) {
  await ready();
  return done(await body.addSteps(input));
}

export async function saveGoalAction(input: unknown) {
  await ready();
  return done(await body.saveGoal(input));
}

export async function deleteGoalAction(id: string) {
  await ready();
  return done(await body.deleteGoal(id));
}

export async function logHyroxAction(input: unknown) {
  await ready();
  return done(await body.logHyrox(input));
}

export async function deleteHyroxAction(id: string) {
  await ready();
  return done(await body.deleteHyrox(id));
}

export async function uploadPhotoAction(formData: FormData) {
  await ready();
  if (process.env.NODE_ENV === "production" && process.env.FORGE_PRIVATE_DEPLOYMENT !== "true") {
    return fail("Photo upload is off until this deployment is marked private and has authentication.");
  }
  const file = formData.get("file");
  const date = String(formData.get("date") ?? "");
  const angle = String(formData.get("angle") ?? "");
  const notes = String(formData.get("notes") ?? "").slice(0, 500);
  if (!(file instanceof File)) return fail("Choose a photo.");
  if (!["front", "side", "back"].includes(angle)) return fail("Choose front, side, or back.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Choose a date.");
  if (file.size > 8 * 1024 * 1024) return fail("Photos need to be 8 MB or smaller.");
  const mime = file.type;
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "";
  if (!ext) return fail("Use a JPEG, PNG, or WebP photo.");
  const filename = `${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "data", "photos");
  await mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);
  await prisma.progressPhoto.create({ data: { date, angle, filename, mimeType: mime, notes } });
  refreshApp();
  return { ok: true as const };
}

export async function deletePhotoAction(id: string) {
  await ready();
  const photo = await prisma.progressPhoto.findUnique({ where: { id } });
  if (!photo) return { ok: true as const };
  await prisma.progressPhoto.delete({ where: { id } });
  const filename = path.basename(photo.filename);
  if (/^[\w.-]+$/.test(filename)) {
    await unlink(path.join(process.cwd(), "data", "photos", filename)).catch(() => undefined);
  }
  refreshApp();
  return { ok: true as const };
}

export async function exportJsonAction() {
  await ready();
  const file = await buildBackup(prisma);
  return { ok: true as const, data: JSON.stringify(file, null, 2) };
}

export async function exportCsvAction(kind: "nutrition" | "workouts" | "weight") {
  await ready();
  const csv = kind === "nutrition" ? await nutritionCsv(prisma) : kind === "workouts" ? await workoutCsv(prisma) : await weightCsv(prisma);
  return { ok: true as const, data: csv };
}

export async function importBackupAction(input: {
  json: string;
  mode: "merge" | "replace";
  allowDuplicate: boolean;
  confirmation: string;
}) {
  await ready();
  if (input.json.length > 80_000_000) return fail("That backup is larger than 80 MB.");
  if (input.mode === "replace" && input.confirmation !== "REPLACE MY DATA") {
    return fail("Type REPLACE MY DATA to confirm a full restore.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(input.json);
  } catch {
    return fail("That file is not valid JSON.");
  }
  const result = await importBackup(prisma, raw, {
    mode: input.mode,
    allowDuplicate: input.allowDuplicate,
  });
  return done(result);
}
