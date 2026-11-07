export const MEAL_TYPES = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
  { id: "pre-workout", label: "Pre-workout" },
  { id: "post-workout", label: "Post-workout" },
] as const;

export type MealTypeId = (typeof MEAL_TYPES)[number]["id"];

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Full body",
] as const;

export const SET_TYPES = [
  { id: "warmup", label: "Warm-up" },
  { id: "working", label: "Working" },
  { id: "drop", label: "Drop set" },
  { id: "failure", label: "Failure set" },
  { id: "pr", label: "Personal record attempt" },
] as const;

export const WEEKDAYS = [
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
  { day: 0, label: "Sunday" },
] as const;

export const HYROX_STATIONS = [
  { id: "skierg", name: "SkiErg", officialMeters: 1000, officialReps: null, metric: "distance" as const },
  { id: "sled_push", name: "Sled Push", officialMeters: 50, officialReps: null, metric: "distance" as const },
  { id: "sled_pull", name: "Sled Pull", officialMeters: 50, officialReps: null, metric: "distance" as const },
  { id: "burpee_broad_jump", name: "Burpee Broad Jumps", officialMeters: 80, officialReps: null, metric: "distance" as const },
  { id: "rowing", name: "Rowing", officialMeters: 1000, officialReps: null, metric: "distance" as const },
  { id: "farmers_carry", name: "Farmer's Carry", officialMeters: 200, officialReps: null, metric: "distance" as const },
  { id: "sandbag_lunges", name: "Sandbag Lunges", officialMeters: 100, officialReps: null, metric: "distance" as const },
  { id: "wall_balls", name: "Wall Balls", officialMeters: null, officialReps: 100, metric: "reps" as const },
  { id: "run", name: "Run", officialMeters: 1000, officialReps: null, metric: "distance" as const },
] as const;

export const CARDIO_ACTIVITIES = [
  { id: "treadmill_run", label: "Treadmill run" },
  { id: "outdoor_run", label: "Outdoor run" },
  { id: "walk", label: "Walking" },
  { id: "skierg", label: "SkiErg" },
  { id: "row", label: "Rowing" },
  { id: "cycle", label: "Cycling" },
  { id: "other", label: "Other cardio" },
] as const;

export const RUN_ACTIVITIES = new Set(["treadmill_run", "outdoor_run"]);

export const PHOTO_ANGLES = ["front", "side", "back"] as const;

export const LB_PER_KG = 2.2046226218;
export const CM_PER_INCH = 2.54;
export const KM_PER_MILE = 1.609344;

export function mealLabel(id: string): string {
  return MEAL_TYPES.find((meal) => meal.id === id)?.label ?? id;
}

export function stationName(id: string): string {
  return HYROX_STATIONS.find((station) => station.id === id)?.name ?? id;
}
