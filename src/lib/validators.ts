import { z } from "zod";
import { isDateKey } from "@/lib/dates";

const dateKey = z.string().refine(isDateKey, "Use a real date.");
const positive = z.number().finite().positive();
const optionalText = z.string().trim().max(2000).optional().default("");

export const logFoodSchema = z.object({
  date: dateKey,
  mealType: z.enum(["breakfast", "lunch", "dinner", "snacks", "pre-workout", "post-workout"]),
  foodId: z.string().min(1),
  quantity: positive,
  unit: z.string().trim().min(1).max(20),
});

export const foodFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name the food.").max(120),
  brand: z.string().trim().max(120).optional().default(""),
  servingSize: positive,
  servingUnit: z.string().trim().min(1).max(20),
  gramsPerServing: z.number().finite().positive().nullable().optional(),
  calories: z.number().finite().min(0),
  proteinG: z.number().finite().min(0),
  carbsG: z.number().finite().min(0),
  fatG: z.number().finite().min(0),
  fiberG: z.number().finite().min(0).optional().default(0),
  sugarG: z.number().finite().min(0).optional().default(0),
  sodiumMg: z.number().finite().min(0).optional().default(0),
  hasSodium: z.boolean().optional().default(false),
  source: z.string().trim().min(1, "Say where the numbers came from.").max(300),
  isEstimate: z.boolean(),
  preparation: z.string().trim().max(40).optional().default(""),
  notes: optionalText,
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  age: z.number().int().min(13).max(100),
  sex: z.string().trim().min(1).max(40),
  heightCm: positive,
  diet: z.string().trim().min(1).max(80),
  allowedFoods: z.string().trim().max(1000),
  excludedFoods: z.string().trim().max(1000),
  baselineWeightKg: positive,
  baselineWaistCm: positive,
  abdominalDefinition: z.string().trim().max(80),
  timezone: z.string().trim().min(1).max(80),
});

export const targetSchema = z.object({
  effectiveFrom: dateKey,
  calories: z.number().int().min(800).max(10000),
  proteinG: z.number().finite().min(0).max(500),
  carbsG: z.number().finite().min(0).max(1500),
  fatG: z.number().finite().min(0).max(500),
  fiberG: z.number().finite().min(0).max(150),
  steps: z.number().int().min(0).max(200000),
  waterMl: z.number().int().min(0).max(20000),
  notes: optionalText,
});

export const weightSchema = z.object({
  date: dateKey,
  weightKg: positive,
  notes: optionalText,
  representative: z.boolean().optional().default(true),
});

export const measurementSchema = z.object({
  date: dateKey,
  waistCm: z.number().finite().positive().nullable().optional(),
  chestCm: z.number().finite().positive().nullable().optional(),
  hipsCm: z.number().finite().positive().nullable().optional(),
  neckCm: z.number().finite().positive().nullable().optional(),
  leftArmCm: z.number().finite().positive().nullable().optional(),
  rightArmCm: z.number().finite().positive().nullable().optional(),
  leftThighCm: z.number().finite().positive().nullable().optional(),
  rightThighCm: z.number().finite().positive().nullable().optional(),
  leftCalfCm: z.number().finite().positive().nullable().optional(),
  rightCalfCm: z.number().finite().positive().nullable().optional(),
  bodyFatPercent: z.number().finite().min(2).max(70).nullable().optional(),
  bodyFatMethod: z.enum(["", "measured", "estimate"]).optional().default(""),
  notes: optionalText,
});

export const goalSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  direction: z.enum(["decrease", "increase", "maintain", "qualitative", "improve"]),
  startingValue: z.number().finite().nullable().optional(),
  targetValue: z.number().finite().nullable().optional(),
  currentValue: z.number().finite().nullable().optional(),
  unit: z.string().trim().max(20).optional().default(""),
  startText: z.string().trim().max(200).optional().default(""),
  targetText: z.string().trim().max(200).optional().default(""),
  startDate: dateKey,
  targetDate: dateKey.nullable().optional(),
  status: z.enum(["active", "paused", "completed"]),
  notes: optionalText,
});

export const setSchema = z.object({
  workoutExerciseId: z.string().min(1),
  weight: z.number().finite().positive().nullable().optional(),
  weightUnit: z.enum(["kg", "lb"]),
  reps: z.number().int().positive().max(500).nullable().optional(),
  rpe: z.number().finite().min(1).max(10).nullable().optional(),
  rir: z.number().finite().min(0).max(10).nullable().optional(),
  setType: z.enum(["warmup", "working", "drop", "failure", "pr"]),
  durationSeconds: z.number().int().positive().max(86400).nullable().optional(),
  distanceM: z.number().finite().positive().nullable().optional(),
  notes: optionalText,
});

export const cardioSchema = z.object({
  date: dateKey,
  activity: z.enum(["treadmill_run", "outdoor_run", "walk", "skierg", "row", "cycle", "other"]),
  distanceKm: z.number().finite().positive().nullable().optional(),
  durationSeconds: z.number().int().positive().max(86400),
  incline: z.number().finite().min(0).max(45).nullable().optional(),
  avgHeartRate: z.number().int().min(30).max(230).nullable().optional(),
  caloriesBurned: z.number().finite().min(0).nullable().optional(),
  caloriesAreEstimate: z.boolean().optional().default(false),
  notes: optionalText,
});

export const hyroxSegmentSchema = z.object({
  segmentType: z.enum(["run", "station", "rest"]),
  station: z.string().trim().max(40).optional().default(""),
  distanceM: z.number().finite().positive().nullable().optional(),
  reps: z.number().int().positive().nullable().optional(),
  weightKg: z.number().finite().positive().nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  notes: optionalText,
});

export const hyroxSchema = z.object({
  date: dateKey,
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["station", "simulation"]),
  notes: optionalText,
  segments: z.array(hyroxSegmentSchema).min(1).max(40),
});

export const settingsSchema = z.object({
  weightUnit: z.enum(["kg", "lb"]),
  lengthUnit: z.enum(["cm", "in"]),
  distanceUnit: z.enum(["km", "mi"]),
  restTimerSeconds: z.number().int().min(10).max(600),
  usdaApiKey: z.string().trim().max(200).optional().default(""),
});

export const recipeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  servings: positive,
  notes: optionalText,
  ingredients: z
    .array(
      z.object({
        foodId: z.string().min(1),
        quantity: positive,
        unit: z.string().trim().min(1).max(20),
      }),
    )
    .min(1),
});

export function issue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}
