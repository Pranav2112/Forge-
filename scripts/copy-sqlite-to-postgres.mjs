import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";

const sqlitePath = process.env.SQLITE_PATH || "data/forge.db";
const target = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;
if (!target.startsWith("postgres")) {
  console.error("DATABASE_URL must be the Postgres connection string. The SQLite file was not changed.");
  process.exit(1);
}

const tables = [
  ["UserProfile", "userProfile"],
  ["UserSettings", "userSettings"],
  ["NutritionTarget", "nutritionTarget"],
  ["Goal", "goal"],
  ["Food", "food"],
  ["Recipe", "recipe"],
  ["RecipeIngredient", "recipeIngredient"],
  ["SavedMeal", "savedMeal"],
  ["SavedMealItem", "savedMealItem"],
  ["MealEntry", "mealEntry"],
  ["MealItem", "mealItem"],
  ["Exercise", "exercise"],
  ["TrainingPlan", "trainingPlan"],
  ["TrainingPlanDay", "trainingPlanDay"],
  ["PlannedExercise", "plannedExercise"],
  ["WorkoutSession", "workoutSession"],
  ["WorkoutExercise", "workoutExercise"],
  ["ExerciseSet", "exerciseSet"],
  ["CardioSession", "cardioSession"],
  ["HyroxSession", "hyroxSession"],
  ["HyroxSegment", "hyroxSegment"],
  ["BodyWeightEntry", "bodyWeightEntry"],
  ["BodyMeasurement", "bodyMeasurement"],
  ["ProgressPhoto", "progressPhoto"],
  ["WaterEntry", "waterEntry"],
  ["StepEntry", "stepEntry"],
  ["ImportLog", "importLog"],
];

const booleans = new Set([
  "hasSodium", "isEstimate", "isFavorite", "catalogManaged", "fiberLessThan", "tracksLoad",
  "isActive", "completed", "caloriesAreEstimate", "isCompleteSimulation", "isRepresentative",
]);
const dates = new Set([
  "createdAt", "updatedAt", "startedAt", "finishedAt", "pausedAt", "weighedAt", "loggedAt", "importedAt",
]);

function convert(row) {
  const data = {};
  for (const [key, value] of Object.entries(row)) {
    if (value == null) data[key] = null;
    else if (booleans.has(key)) data[key] = value === true || value === 1 || value === "1";
    else if (dates.has(key)) data[key] = value instanceof Date ? value : new Date(value);
    else data[key] = value;
  }
  return data;
}

const source = new DatabaseSync(sqlitePath, { readOnly: true });
const prisma = new PrismaClient();
const summary = {};

for (const [table, model] of tables) {
  const rows = source.prepare(`SELECT * FROM "${table}"`).all().map(convert);
  const before = await prisma[model].count();
  if (rows.length > 0) {
    await prisma[model].createMany({ data: rows, skipDuplicates: true });
  }
  const after = await prisma[model].count();
  summary[table] = { sqlite: rows.length, postgres: after, inserted: after - before };
  if (after < rows.length) {
    console.error(JSON.stringify({ table, sqlite: rows.length, postgres: after }));
    await prisma.$disconnect();
    process.exit(1);
  }
}

console.log(JSON.stringify(summary));
await prisma.$disconnect();
source.close();
