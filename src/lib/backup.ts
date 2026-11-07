import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

const iso = z.string().min(4);
const id = z.string().min(1);

const profileSchema = z.object({
  id: z.literal("default"),
  name: z.string(),
  age: z.number().int(),
  sex: z.string(),
  heightCm: z.number(),
  diet: z.string(),
  allowedFoods: z.string(),
  excludedFoods: z.string(),
  baselineWeightKg: z.number(),
  baselineWaistCm: z.number(),
  abdominalDefinition: z.string(),
  timezone: z.string(),
  createdAt: iso,
  updatedAt: iso,
});

const settingsSchema = z.object({
  id: z.literal("default"),
  weightUnit: z.string(),
  lengthUnit: z.string(),
  distanceUnit: z.string(),
  restTimerSeconds: z.number().int(),
  usdaApiKey: z.string(),
  catalogVersion: z.number().int().optional(),
  ownerId: z.string().optional(),
});

const targetSchema = z.object({
  id, effectiveFrom: z.string(), calories: z.number(), proteinG: z.number(), carbsG: z.number(), fatG: z.number(),
  fiberG: z.number(), steps: z.number(), waterMl: z.number(), notes: z.string(), createdAt: iso,
});

const goalSchema = z.object({
  id, name: z.string(), category: z.string(), direction: z.string(),
  startingValue: z.number().nullable(), targetValue: z.number().nullable(), currentValue: z.number().nullable(),
  unit: z.string(), startText: z.string(), targetText: z.string(), startDate: z.string(), targetDate: z.string().nullable(),
  status: z.string(), notes: z.string(), createdAt: iso, updatedAt: iso,
});

const foodSchema = z.object({
  id, name: z.string(), brand: z.string(), servingSize: z.number(), servingUnit: z.string(),
  gramsPerServing: z.number().nullable(), calories: z.number(), proteinG: z.number(), carbsG: z.number(), fatG: z.number(),
  fiberG: z.number(), sugarG: z.number(), sodiumMg: z.number(), hasSodium: z.boolean(), source: z.string(),
  isEstimate: z.boolean(), isFavorite: z.boolean(), preparation: z.string(), notes: z.string(),
  aliases: z.string().optional(), seedKey: z.string().nullable().optional(), catalogManaged: z.boolean().optional(),
  saturatedFatG: z.number().optional(), cholesterolMg: z.number().optional(), calciumMg: z.number().optional(),
  ironMg: z.number().optional(), potassiumMg: z.number().optional(), bcaaG: z.number().optional(),
  fiberLessThan: z.boolean().optional(), createdAt: iso, updatedAt: iso,
});

const recipeSchema = z.object({
  id, name: z.string(), servings: z.number(), notes: z.string(), createdAt: iso, updatedAt: iso,
});
const recipeIngredientSchema = z.object({
  id, recipeId: z.string(), foodId: z.string(), quantity: z.number(), unit: z.string(),
});
const savedMealSchema = z.object({
  id, name: z.string(), mealType: z.string(), notes: z.string(), createdAt: iso, updatedAt: iso,
});
const savedMealItemSchema = z.object({
  id, savedMealId: z.string(), foodId: z.string(), quantity: z.number(), unit: z.string(),
});
const mealEntrySchema = z.object({
  id, date: z.string(), mealType: z.string(), notes: z.string(), createdAt: iso, updatedAt: iso,
});
const mealItemSchema = z.object({
  id, mealEntryId: z.string(), foodId: z.string().nullable(), recipeId: z.string().nullable(), name: z.string(),
  brand: z.string(), quantity: z.number(), unit: z.string(), calories: z.number(), proteinG: z.number(), carbsG: z.number(),
  fatG: z.number(), fiberG: z.number(), sugarG: z.number(), sodiumMg: z.number(), hasSodium: z.boolean(),
  saturatedFatG: z.number().optional(), cholesterolMg: z.number().optional(), calciumMg: z.number().optional(),
  ironMg: z.number().optional(), potassiumMg: z.number().optional(), bcaaG: z.number().optional(),
  fiberLessThan: z.boolean().optional(),
  isEstimate: z.boolean(), preparation: z.string(), createdAt: iso,
});
const exerciseSchema = z.object({
  id, name: z.string(), primaryMuscle: z.string(), secondaryMuscles: z.string(), equipment: z.string(),
  exerciseType: z.string(), instructions: z.string(), demoUrl: z.string(), notes: z.string(), tracksLoad: z.boolean(),
  createdAt: iso, updatedAt: iso,
});
const planSchema = z.object({
  id, name: z.string(), isActive: z.boolean(), notes: z.string(), createdAt: iso, updatedAt: iso,
});
const planDaySchema = z.object({
  id, planId: z.string(), dayOfWeek: z.number().int(), name: z.string(), focus: z.string(), notes: z.string(),
});
const plannedExerciseSchema = z.object({
  id, dayId: z.string(), exerciseId: z.string(), sortOrder: z.number().int(), targetSets: z.number().int().nullable(),
  targetReps: z.string(), notes: z.string(),
});
const sessionSchema = z.object({
  id, date: z.string(), name: z.string(), planDayId: z.string().nullable(), status: z.string(), startedAt: iso,
  finishedAt: iso.nullable(), pausedAt: iso.nullable(), accumulatedPauseMs: z.number().int(), notes: z.string(),
  createdAt: iso, updatedAt: iso,
});
const workoutExerciseSchema = z.object({
  id, sessionId: z.string(), exerciseId: z.string(), sortOrder: z.number().int(), notes: z.string(),
});
const setSchema = z.object({
  id, workoutExerciseId: z.string(), setNumber: z.number().int(), weight: z.number().nullable(), weightUnit: z.string(),
  reps: z.number().int().nullable(), rpe: z.number().nullable(), rir: z.number().nullable(), restSeconds: z.number().int().nullable(),
  setType: z.string(), durationSeconds: z.number().int().nullable(), distanceM: z.number().nullable(), notes: z.string(),
  completed: z.boolean(), createdAt: iso,
});
const cardioSchema = z.object({
  id, date: z.string(), activity: z.string(), distanceKm: z.number().nullable(), durationSeconds: z.number().int(),
  incline: z.number().nullable(), avgHeartRate: z.number().int().nullable(), caloriesBurned: z.number().nullable(),
  caloriesAreEstimate: z.boolean(), notes: z.string(), createdAt: iso,
});
const hyroxSessionSchema = z.object({
  id, date: z.string(), name: z.string(), kind: z.string(), notes: z.string(), isCompleteSimulation: z.boolean(), createdAt: iso,
});
const hyroxSegmentSchema = z.object({
  id, sessionId: z.string(), sortOrder: z.number().int(), segmentType: z.string(), station: z.string(),
  distanceM: z.number().nullable(), reps: z.number().int().nullable(), weightKg: z.number().nullable(),
  durationSeconds: z.number().int().nullable(), notes: z.string(),
});
const weightSchema = z.object({
  id, date: z.string(), weighedAt: iso, weightKg: z.number(), isRepresentative: z.boolean(), notes: z.string(),
});
const measurementSchema = z.object({
  id, date: z.string(), waistCm: z.number().nullable(), chestCm: z.number().nullable(), hipsCm: z.number().nullable(),
  neckCm: z.number().nullable(), leftArmCm: z.number().nullable(), rightArmCm: z.number().nullable(),
  leftThighCm: z.number().nullable(), rightThighCm: z.number().nullable(), leftCalfCm: z.number().nullable(),
  rightCalfCm: z.number().nullable(), bodyFatPercent: z.number().nullable(), bodyFatMethod: z.string(), notes: z.string(),
  createdAt: iso,
});
const photoSchema = z.object({
  id, date: z.string(), angle: z.string(), filename: z.string(), mimeType: z.string(), notes: z.string(),
  createdAt: iso, bytesBase64: z.string().nullable(),
});
const waterSchema = z.object({ id, date: z.string(), amountMl: z.number().int(), loggedAt: iso });
const stepSchema = z.object({ id, date: z.string(), steps: z.number().int(), notes: z.string(), loggedAt: iso });

const dataSchema = z.object({
  profile: profileSchema.nullable(),
  settings: settingsSchema.nullable(),
  targets: z.array(targetSchema),
  goals: z.array(goalSchema),
  foods: z.array(foodSchema),
  recipes: z.array(recipeSchema),
  recipeIngredients: z.array(recipeIngredientSchema),
  savedMeals: z.array(savedMealSchema),
  savedMealItems: z.array(savedMealItemSchema),
  mealEntries: z.array(mealEntrySchema),
  mealItems: z.array(mealItemSchema),
  exercises: z.array(exerciseSchema),
  plans: z.array(planSchema),
  planDays: z.array(planDaySchema),
  plannedExercises: z.array(plannedExerciseSchema),
  workouts: z.array(sessionSchema),
  workoutExercises: z.array(workoutExerciseSchema),
  sets: z.array(setSchema),
  cardio: z.array(cardioSchema),
  hyroxSessions: z.array(hyroxSessionSchema),
  hyroxSegments: z.array(hyroxSegmentSchema),
  weights: z.array(weightSchema),
  measurements: z.array(measurementSchema),
  photos: z.array(photoSchema),
  water: z.array(waterSchema),
  steps: z.array(stepSchema),
});

const fileSchema = z.object({
  format: z.literal("forge-backup"),
  version: z.literal(1),
  exportedAt: iso,
  checksum: z.string().min(32),
  data: dataSchema,
});

export type BackupFile = z.infer<typeof fileSchema>;

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function checksumOf(data: unknown): string {
  return createHash("sha256").update(stableStringify(data)).digest("hex");
}

function dateOf(value: string) {
  return new Date(value);
}

function photoDir() {
  return path.join(process.cwd(), "data", "photos");
}

function safePhotoName(filename: string) {
  const base = path.basename(filename);
  if (!/^[\w.-]+$/.test(base)) throw new Error("A photo filename in the backup is not safe to write.");
  return base;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

export async function buildBackup(db: PrismaClient): Promise<BackupFile> {
  const [
    profile, settings, targets, goals, foods, recipes, recipeIngredients, savedMeals, savedMealItems,
    mealEntries, mealItems, exercises, plans, planDays, plannedExercises, workouts, workoutExercises,
    sets, cardio, hyroxSessions, hyroxSegments, weights, measurements, photos, water, steps,
  ] = await Promise.all([
    db.userProfile.findUnique({ where: { id: "default" } }),
    db.userSettings.findUnique({ where: { id: "default" } }).then((row) => row && ({
      id: row.id,
      weightUnit: row.weightUnit,
      lengthUnit: row.lengthUnit,
      distanceUnit: row.distanceUnit,
      restTimerSeconds: row.restTimerSeconds,
      usdaApiKey: row.usdaApiKey,
      catalogVersion: row.catalogVersion,
      ownerId: row.ownerId,
    })),
    db.nutritionTarget.findMany(),
    db.goal.findMany(),
    db.food.findMany(),
    db.recipe.findMany(),
    db.recipeIngredient.findMany(),
    db.savedMeal.findMany(),
    db.savedMealItem.findMany(),
    db.mealEntry.findMany(),
    db.mealItem.findMany(),
    db.exercise.findMany(),
    db.trainingPlan.findMany(),
    db.trainingPlanDay.findMany(),
    db.plannedExercise.findMany(),
    db.workoutSession.findMany(),
    db.workoutExercise.findMany(),
    db.exerciseSet.findMany(),
    db.cardioSession.findMany(),
    db.hyroxSession.findMany(),
    db.hyroxSegment.findMany(),
    db.bodyWeightEntry.findMany(),
    db.bodyMeasurement.findMany(),
    db.progressPhoto.findMany(),
    db.waterEntry.findMany(),
    db.stepEntry.findMany(),
  ]);

  const photoRows = [];
  for (const photo of photos) {
    let bytesBase64: string | null = null;
    try {
      const bytes = await readFile(path.join(photoDir(), safePhotoName(photo.filename)));
      bytesBase64 = bytes.toString("base64");
    } catch {
      bytesBase64 = null;
    }
    photoRows.push({ ...photo, bytesBase64 });
  }

  const data = {
    profile,
    settings,
    targets,
    goals,
    foods,
    recipes,
    recipeIngredients,
    savedMeals,
    savedMealItems,
    mealEntries,
    mealItems,
    exercises,
    plans,
    planDays,
    plannedExercises,
    workouts,
    workoutExercises,
    sets,
    cardio,
    hyroxSessions,
    hyroxSegments,
    weights,
    measurements,
    photos: photoRows,
    water,
    steps,
  };

  const serialized = JSON.parse(
    JSON.stringify(data, (_key, value) => (value instanceof Date ? value.toISOString() : value)),
  ) as BackupFile["data"];

  return {
    format: "forge-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    checksum: checksumOf(serialized),
    data: serialized,
  };
}

async function wipe(db: PrismaClient) {
  await db.exerciseSet.deleteMany();
  await db.workoutExercise.deleteMany();
  await db.workoutSession.deleteMany();
  await db.plannedExercise.deleteMany();
  await db.trainingPlanDay.deleteMany();
  await db.trainingPlan.deleteMany();
  await db.hyroxSegment.deleteMany();
  await db.hyroxSession.deleteMany();
  await db.cardioSession.deleteMany();
  await db.mealItem.deleteMany();
  await db.mealEntry.deleteMany();
  await db.savedMealItem.deleteMany();
  await db.savedMeal.deleteMany();
  await db.recipeIngredient.deleteMany();
  await db.recipe.deleteMany();
  await db.bodyWeightEntry.deleteMany();
  await db.bodyMeasurement.deleteMany();
  await db.progressPhoto.deleteMany();
  await db.waterEntry.deleteMany();
  await db.stepEntry.deleteMany();
  await db.goal.deleteMany();
  await db.nutritionTarget.deleteMany();
  await db.food.deleteMany();
  await db.exercise.deleteMany();
  await db.userProfile.deleteMany();
  await db.userSettings.deleteMany();
}

export async function importBackup(
  db: PrismaClient,
  raw: unknown,
  options: { mode: "merge" | "replace"; allowDuplicate: boolean },
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "This file is not a FORGE backup." };
  }
  const file = parsed.data;
  const checksum = checksumOf(file.data);
  if (checksum !== file.checksum) {
    return { ok: false, error: "The backup checksum does not match its contents, so it was not imported." };
  }
  const prior = await db.importLog.findFirst({ where: { checksum } });
  if (prior && !options.allowDuplicate) {
    return {
      ok: false,
      error: "This exact backup was already imported. Turn on “Import even if this file was imported before” if you mean to bring it in again.",
    };
  }

  const data = file.data;
  const asDate = <T extends Record<string, unknown>>(row: T, keys: string[]) => {
    const copy: Record<string, unknown> = { ...row };
    for (const key of keys) {
      const value = copy[key];
      copy[key] = value == null ? null : dateOf(String(value));
    }
    return copy;
  };

  try {
    await db.$transaction(async (tx) => {
      if (options.mode === "replace") await wipe(tx as unknown as PrismaClient);
      const skip = options.mode === "merge";

      if (data.profile) {
        const row = asDate(data.profile, ["createdAt", "updatedAt"]);
        if (skip) {
          await tx.userProfile.upsert({
            where: { id: "default" },
            create: row as never,
            update: {},
          });
        } else {
          await tx.userProfile.create({ data: row as never });
        }
      }
      if (data.settings) {
        const row = data.settings;
        if (skip) {
          await tx.userSettings.upsert({ where: { id: "default" }, create: row, update: {} });
        } else {
          await tx.userSettings.create({ data: row });
        }
      }

      const many = async (rows: unknown[], write: (row: never) => Promise<unknown>) => {
        for (const row of rows) {
          if (skip) await tx.$executeRawUnsafe("SAVEPOINT forge_import_row");
          try {
            await write(row as never);
            if (skip) await tx.$executeRawUnsafe("RELEASE SAVEPOINT forge_import_row");
          } catch (error) {
            const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
            if (skip && (code === "P2002" || code === "P2003")) {
              await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT forge_import_row");
              continue;
            }
            throw error;
          }
        }
      };

      await many(data.foods, (row) => tx.food.create({ data: asDate(row, ["createdAt", "updatedAt"]) as never }));
      await many(data.exercises, (row) => tx.exercise.create({ data: asDate(row, ["createdAt", "updatedAt"]) as never }));
      await many(data.targets, (row) => tx.nutritionTarget.create({ data: asDate(row, ["createdAt"]) as never }));
      await many(data.goals, (row) => tx.goal.create({ data: asDate(row, ["createdAt", "updatedAt"]) as never }));
      await many(data.recipes, (row) => tx.recipe.create({ data: asDate(row, ["createdAt", "updatedAt"]) as never }));
      await many(data.recipeIngredients, (row) => tx.recipeIngredient.create({ data: row }));
      await many(data.savedMeals, (row) => tx.savedMeal.create({ data: asDate(row, ["createdAt", "updatedAt"]) as never }));
      await many(data.savedMealItems, (row) => tx.savedMealItem.create({ data: row }));
      await many(data.mealEntries, (row) => tx.mealEntry.create({ data: asDate(row, ["createdAt", "updatedAt"]) as never }));
      await many(data.mealItems, (row) => tx.mealItem.create({ data: asDate(row, ["createdAt"]) as never }));
      await many(data.plans, (row) => tx.trainingPlan.create({ data: asDate(row, ["createdAt", "updatedAt"]) as never }));
      await many(data.planDays, (row) => tx.trainingPlanDay.create({ data: row }));
      await many(data.plannedExercises, (row) => tx.plannedExercise.create({ data: row }));
      await many(data.workouts, (row) =>
        tx.workoutSession.create({ data: asDate(row, ["startedAt", "finishedAt", "pausedAt", "createdAt", "updatedAt"]) as never }),
      );
      await many(data.workoutExercises, (row) => tx.workoutExercise.create({ data: row }));
      await many(data.sets, (row) => tx.exerciseSet.create({ data: asDate(row, ["createdAt"]) as never }));
      await many(data.cardio, (row) => tx.cardioSession.create({ data: asDate(row, ["createdAt"]) as never }));
      await many(data.hyroxSessions, (row) => tx.hyroxSession.create({ data: asDate(row, ["createdAt"]) as never }));
      await many(data.hyroxSegments, (row) => tx.hyroxSegment.create({ data: row }));
      await many(data.weights, (row) => tx.bodyWeightEntry.create({ data: asDate(row, ["weighedAt"]) as never }));
      await many(data.measurements, (row) => tx.bodyMeasurement.create({ data: asDate(row, ["createdAt"]) as never }));
      await many(data.water, (row) => tx.waterEntry.create({ data: asDate(row, ["loggedAt"]) as never }));
      await many(data.steps, (row) => tx.stepEntry.create({ data: asDate(row, ["loggedAt"]) as never }));

      await mkdir(photoDir(), { recursive: true });
      for (const photo of data.photos) {
        const { bytesBase64, ...row } = photo;
        const filename = safePhotoName(row.filename);
        if (skip) await tx.$executeRawUnsafe("SAVEPOINT forge_import_row");
        try {
          await tx.progressPhoto.create({ data: asDate({ ...row, filename }, ["createdAt"]) as never });
          if (skip) await tx.$executeRawUnsafe("RELEASE SAVEPOINT forge_import_row");
        } catch (error) {
          const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
          if (skip && code === "P2002") {
            await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT forge_import_row");
            continue;
          }
          throw error;
        }
        if (bytesBase64) {
          await writeFile(path.join(photoDir(), filename), Buffer.from(bytesBase64, "base64"));
        }
      }

      await tx.importLog.create({
        data: {
          checksum,
          mode: options.mode,
          summary: `Foods ${data.foods.length}, meals ${data.mealEntries.length}, workouts ${data.workouts.length}, weights ${data.weights.length}`,
        },
      });
    }, { timeout: 120000 });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Import failed and was rolled back." };
  }

  return {
    ok: true,
    summary: options.mode === "replace" ? "Restored this backup over the previous database." : "Merged this backup. Existing records with the same ids were left as they were.",
  };
}

export async function nutritionCsv(db: PrismaClient) {
  const items = await db.mealItem.findMany({ include: { mealEntry: true }, orderBy: [{ mealEntry: { date: "asc" } }, { createdAt: "asc" }] });
  return toCsv(
    ["date", "meal", "food", "quantity", "unit", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "estimate"],
    items.map((item) => [
      item.mealEntry.date, item.mealEntry.mealType, item.name, item.quantity, item.unit,
      round(item.calories), round(item.proteinG), round(item.carbsG), round(item.fatG), round(item.fiberG),
      item.isEstimate ? "estimate" : "recorded",
    ]),
  );
}

export async function workoutCsv(db: PrismaClient) {
  const sets = await db.exerciseSet.findMany({
    include: { workoutExercise: { include: { exercise: true, session: true } } },
    orderBy: { createdAt: "asc" },
  });
  return toCsv(
    ["date", "workout", "exercise", "set", "type", "weight", "unit", "reps", "rpe", "duration_seconds", "distance_m"],
    sets.map((set) => [
      set.workoutExercise.session.date,
      set.workoutExercise.session.name,
      set.workoutExercise.exercise.name,
      set.setNumber,
      set.setType,
      set.weight,
      set.weightUnit,
      set.reps,
      set.rpe,
      set.durationSeconds,
      set.distanceM,
    ]),
  );
}

export async function weightCsv(db: PrismaClient) {
  const rows = await db.bodyWeightEntry.findMany({ orderBy: { weighedAt: "asc" } });
  return toCsv(
    ["date", "weighed_at", "weight_kg", "representative", "notes"],
    rows.map((row) => [row.date, row.weighedAt.toISOString(), row.weightKg, row.isRepresentative ? "yes" : "no", row.notes]),
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
