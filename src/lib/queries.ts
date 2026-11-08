import { connection } from "next/server";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import {
  average,
  bestEffort,
  buildInsights,
  canEstimate1RM,
  changeFromPriorPoint,
  estimateEpley1RM,
  fastestNearDistance,
  goalProgress,
  macroPercents,
  paceSecondsPerKm,
  remaining,
  representativeByDate,
  scaleNutrition,
  sevenDayAverage,
  setVolumeKg,
  speedKmh,
  sumNutrition,
  toKg,
  totalVolumeKg,
  type MacroSnapshot,
} from "@/lib/calc";
import { HYROX_STATIONS, RUN_ACTIVITIES, WEEKDAYS } from "@/lib/constants";
import { addDaysKey, dateFromKey, dayOfWeek, displayDate, isDateKey, todayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { seedIfEmpty } from "@/lib/seed/run";
import { syncCatalog } from "@/lib/seed/sync";
import { authRequired, currentUser } from "@/lib/auth";

const EMPTY: MacroSnapshot = {
  calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0,
};

function isSetupError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
  return code === "P2021" || code === "P1001" || code === "P1003";
}

export async function bootstrap() {
  await connection();
  try {
    await seedIfEmpty(prisma);
    await syncCatalog(prisma);
    const profile = await prisma.userProfile.findUnique({ where: { id: "default" } });
    const settings = await prisma.userSettings.findUnique({ where: { id: "default" } });
    if (!profile || !settings) return { ready: false as const };
    if (authRequired()) {
      const user = await currentUser();
      if (!user) return { ready: false as const, needsAuth: true as const };
      if (settings.ownerId && settings.ownerId !== user.id) return { ready: false as const, needsAuth: true as const };
      if (!settings.ownerId) {
        await prisma.userSettings.update({ where: { id: "default" }, data: { ownerId: user.id } });
      }
    }
    return {
      ready: true as const,
      profile: {
        ...profile,
        allowedFoods: parseList(profile.allowedFoods),
        excludedFoods: parseList(profile.excludedFoods),
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      settings,
      today: todayKey(profile.timezone),
    };
  } catch (error) {
    if (isSetupError(error)) return { ready: false as const };
    throw error;
  }
}

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Stored as plain text on older rows.
  }
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

async function targetFor(date: string) {
  return prisma.nutritionTarget.findFirst({
    where: { effectiveFrom: { lte: date } },
    orderBy: { effectiveFrom: "desc" },
  });
}

function totalsOf(items: MacroSnapshot[]) {
  return items.length ? sumNutrition(items) : { ...EMPTY };
}

export async function getDashboard() {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const { today, profile, settings } = base;
  const weekStart = format(startOfWeek(dateFromKey(today), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const from = addDaysKey(today, -60);
  const [meals, weights, measurements, water, steps, cardio, plan, sessions, foods] = await Promise.all([
    prisma.mealEntry.findMany({ where: { date: { gte: addDaysKey(today, -14), lte: today } }, include: { items: true } }),
    prisma.bodyWeightEntry.findMany({ where: { date: { gte: from, lte: today } }, orderBy: { weighedAt: "asc" } }),
    prisma.bodyMeasurement.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.waterEntry.findMany({ where: { date: today } }),
    prisma.stepEntry.findMany({ where: { date: today } }),
    prisma.cardioSession.findMany({ where: { date: today } }),
    prisma.trainingPlan.findFirst({
      where: { isActive: true },
      include: { days: { include: { exercises: { include: { exercise: true }, orderBy: { sortOrder: "asc" } } } } },
    }),
    prisma.workoutSession.findMany({
      where: { date: { gte: weekStart, lte: today } },
      include: { exercises: { include: { sets: true } } },
    }),
    prisma.food.findMany({ orderBy: { name: "asc" } }),
  ]);

  const target = await targetFor(today);
  const todayMeals = meals.filter((meal) => meal.date === today);
  const consumed = totalsOf(todayMeals.flatMap((meal) => meal.items));
  const daily = meals.reduce<Record<string, MacroSnapshot>>((map, meal) => {
    map[meal.date] = sumNutrition([...(map[meal.date] ? [map[meal.date]] : []), ...meal.items]);
    return map;
  }, {});
  const loggedDays = Object.values(daily);
  const last7Keys = Array.from({ length: 7 }, (_, index) => addDaysKey(today, -index));
  const calorieSeries = last7Keys.map((key) => daily[key]?.calories).filter((value): value is number => value != null);
  const proteinSeries = last7Keys.map((key) => daily[key]?.proteinG).filter((value): value is number => value != null);

  const weightSeries = representativeByDate(
    weights.map((row) => ({
      date: row.date,
      value: row.weightKg,
      at: row.weighedAt.toISOString(),
      isRepresentative: row.isRepresentative,
    })),
  );
  const latestWeight = weightSeries.at(-1) ?? null;
  const latestWaist = measurements.find((row) => row.waistCm != null) ?? null;
  const day = plan?.days.find((row) => row.dayOfWeek === dayOfWeek(today)) ?? null;
  const active = sessions.find((session) => session.status === "active" || session.status === "paused") ?? null;
  const completedToday = sessions.some((session) => session.date === today && session.status === "completed");
  const planned = (plan?.days ?? []).filter((row) => {
    if (row.exercises.length === 0) return false;
    const dates = eachDayOfInterval({ start: dateFromKey(weekStart), end: dateFromKey(today) });
    return dates.some((date) => date.getDay() === row.dayOfWeek);
  });
  const doneIds = new Set(sessions.filter((session) => session.status === "completed" && session.planDayId).map((session) => session.planDayId));

  const bench = await exerciseEstimateDelta("Barbell Bench Press");
  const paceDelta = await paceDeltaSec(today);

  const insights = buildInsights({
    weightEntries: weightSeries,
    today,
    latestWeightKg: latestWeight?.value ?? null,
    proteinAvg7: average(proteinSeries),
    proteinDays: proteinSeries.length,
    proteinTarget: target?.proteinG ?? 180,
    calorieAvg7: average(calorieSeries),
    calorieDays: calorieSeries.length,
    calorieTarget: target?.calories ?? 2100,
    workoutsCompleted: planned.filter((row) => doneIds.has(row.id)).length,
    workoutsPlanned: planned.length,
    benchDeltaKg: bench,
    paceDeltaSec: paceDelta,
  });

  const goal = await prisma.goal.findFirst({ where: { category: "weight", status: "active" } });

  return {
    ready: true as const,
    profile,
    settings,
    today,
    todayLabel: displayDate(today),
    daysLeft: goal?.targetDate ? Math.max(0, Math.round((dateFromKey(goal.targetDate).getTime() - dateFromKey(today).getTime()) / 86400000)) : null,
    targetDate: goal?.targetDate ?? "2026-12-31",
    target,
    consumed,
    remaining: target
      ? {
          calories: remaining(target.calories, consumed.calories),
          proteinG: remaining(target.proteinG, consumed.proteinG),
          carbsG: remaining(target.carbsG, consumed.carbsG),
          fatG: remaining(target.fatG, consumed.fatG),
        }
      : null,
    percents: macroPercents(consumed.proteinG, consumed.carbsG, consumed.fatG),
    averages: {
      calories: average(calorieSeries),
      protein: average(proteinSeries),
      days: loggedDays.filter((dayTotals) => last7Keys.includes(Object.keys(daily).find((key) => daily[key] === dayTotals) ?? "")).length,
    },
    loggedDayCount: calorieSeries.length,
    planDay: day
      ? {
          id: day.id,
          name: day.name,
          focus: day.focus,
          notes: day.notes,
          exercises: day.exercises.map((row) => ({
            id: row.id,
            name: row.exercise.name,
            targetSets: row.targetSets,
            targetReps: row.targetReps,
          })),
        }
      : null,
    activeWorkout: active ? { id: active.id, name: active.name, status: active.status } : null,
    completedToday,
    latestWeight,
    baselineWeight: profile.baselineWeightKg,
    averageWeight7: sevenDayAverage(weightSeries, today),
    weeklyWeightChange: changeFromPriorPoint(weightSeries, 7),
    latestWaistCm: latestWaist?.waistCm ?? null,
    baselineWaistCm: profile.baselineWaistCm,
    waterMl: water.reduce((sum, row) => sum + row.amountMl, 0),
    steps: steps.reduce((sum, row) => sum + row.steps, 0),
    cardioSeconds: cardio.reduce((sum, row) => sum + row.durationSeconds, 0),
    cardioKm: cardio.reduce((sum, row) => sum + (row.distanceKm ?? 0), 0),
    insights,
    foods: foods.map(serializeFood),
    weightPoints: weightSeries.slice(-14).map((row) => ({ date: row.date.slice(5), kg: Math.round(row.value * 10) / 10 })),
  };
}

function serializeFood(food: {
  id: string; name: string; brand: string; servingSize: number; servingUnit: string; gramsPerServing: number | null;
  calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; sugarG: number; sodiumMg: number;
  hasSodium: boolean; source: string; isEstimate: boolean; isFavorite: boolean; preparation: string; notes: string;
  aliases: string;
}) {
  return food;
}

async function exerciseEstimateDelta(name: string) {
  const exercise = await prisma.exercise.findUnique({ where: { name } });
  if (!exercise || !canEstimate1RM(exercise)) return null;
  const sets = await prisma.exerciseSet.findMany({
    where: { workoutExercise: { exerciseId: exercise.id, session: { status: "completed" } }, setType: { not: "warmup" } },
    include: { workoutExercise: { include: { session: true } } },
    orderBy: { createdAt: "asc" },
  });
  const bySession = new Map<string, number>();
  for (const set of sets) {
    if (set.weight == null || set.reps == null) continue;
    const estimate = estimateEpley1RM(toKg(set.weight, set.weightUnit), set.reps);
    if (estimate == null) continue;
    const key = set.workoutExercise.sessionId;
    bySession.set(key, Math.max(bySession.get(key) ?? 0, estimate));
  }
  const values = [...bySession.values()];
  if (values.length < 2) return null;
  return values[values.length - 1] - values[values.length - 2];
}

async function paceDeltaSec(today: string) {
  const recentStart = addDaysKey(today, -29);
  const priorEnd = addDaysKey(today, -30);
  const priorStart = addDaysKey(today, -59);
  const runs = await prisma.cardioSession.findMany({
    where: { activity: { in: ["treadmill_run", "outdoor_run"] }, distanceKm: { gt: 0 } },
  });
  const pace = (rows: { date: string; distanceKm: number | null; durationSeconds: number }[], start: string, end: string) => {
    const paces = rows
      .filter((row) => row.date >= start && row.date <= end && row.distanceKm)
      .map((row) => paceSecondsPerKm(row.durationSeconds, row.distanceKm as number))
      .filter((value): value is number => value != null);
    return average(paces);
  };
  const recent = pace(runs, recentStart, today);
  const prior = pace(runs, priorStart, priorEnd);
  if (recent == null || prior == null) return null;
  return recent - prior;
}

export async function getNutrition(dateInput?: string) {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const date = dateInput && isDateKey(dateInput) ? dateInput : base.today;
  const monthDate = dateFromKey(date);
  const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
  const historyStart = addDaysKey(date, -13);
  const [meals, foods, saved, recipes, recentItems, monthMeals, target] = await Promise.all([
    prisma.mealEntry.findMany({ where: { date }, include: { items: { orderBy: { createdAt: "asc" } } } }),
    prisma.food.findMany({ orderBy: { name: "asc" } }),
    prisma.savedMeal.findMany({ include: { items: { include: { food: true } } }, orderBy: { name: "asc" } }),
    prisma.recipe.findMany({ include: { ingredients: { include: { food: true } } }, orderBy: { name: "asc" } }),
    prisma.mealItem.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
    prisma.mealEntry.findMany({
      where: { date: { gte: monthStart < historyStart ? monthStart : historyStart, lte: date > monthEnd ? date : monthEnd } },
      include: { items: true },
    }),
    targetFor(date),
  ]);

  const consumed = totalsOf(meals.flatMap((meal) => meal.items));
  const byDate = new Map<string, MacroSnapshot>();
  for (const meal of monthMeals) {
    const current = byDate.get(meal.date) ?? { ...EMPTY };
    byDate.set(meal.date, sumNutrition([current, ...meal.items]));
  }
  const last7 = Array.from({ length: 7 }, (_, index) => addDaysKey(date, -index));
  const calorieSeries = last7.map((key) => byDate.get(key)?.calories).filter((value): value is number => value != null);
  const proteinSeries = last7.map((key) => byDate.get(key)?.proteinG).filter((value): value is number => value != null);

  const recentIds: string[] = [];
  for (const item of recentItems) {
    if (item.foodId && !recentIds.includes(item.foodId)) recentIds.push(item.foodId);
    if (recentIds.length >= 8) break;
  }
  const frequency = new Map<string, number>();
  for (const item of recentItems) {
    if (!item.foodId) continue;
    frequency.set(item.foodId, (frequency.get(item.foodId) ?? 0) + 1);
  }

  const signatures = new Map<string, { count: number; id: string; mealType: string; names: string[] }>();
  for (const meal of monthMeals) {
    if (meal.items.length === 0) continue;
    const signature = meal.items
      .map((item) => `${item.foodId ?? item.name}:${item.quantity}:${item.unit}`)
      .sort()
      .join("|");
    const current = signatures.get(signature);
    if (current) current.count += 1;
    else signatures.set(signature, { count: 1, id: meal.id, mealType: meal.mealType, names: meal.items.map((item) => item.name) });
  }

  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const calendar = eachDayOfInterval({ start: gridStart, end: gridEnd }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const inMonth = day.getMonth() === monthDate.getMonth();
    return { date: key, inMonth, calories: byDate.get(key)?.calories ?? null };
  });

  return {
    ready: true as const,
    profile: base.profile,
    settings: base.settings,
    today: base.today,
    date,
    dateLabel: displayDate(date),
    target,
    consumed,
    remaining: target
      ? {
          calories: remaining(target.calories, consumed.calories),
          proteinG: remaining(target.proteinG, consumed.proteinG),
        }
      : null,
    percents: macroPercents(consumed.proteinG, consumed.carbsG, consumed.fatG),
    averages: { calories: average(calorieSeries), protein: average(proteinSeries), days: calorieSeries.length },
    meals: meals.map((meal) => ({
      id: meal.id,
      mealType: meal.mealType,
      notes: meal.notes,
      items: meal.items.map((item) => ({
        id: item.id,
        foodId: item.foodId,
        name: item.name,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        fiberG: item.fiberG,
        isEstimate: item.isEstimate,
        preparation: item.preparation,
      })),
    })),
    foods: foods.map(serializeFood),
    recentIds,
    savedMeals: saved.map((meal) => ({
      id: meal.id,
      name: meal.name,
      mealType: meal.mealType,
      notes: meal.notes,
      items: meal.items.map((item) => ({
        id: item.id,
        foodId: item.foodId,
        name: item.food.name,
        quantity: item.quantity,
        unit: item.unit,
        isEstimate: item.food.isEstimate,
        preparation: item.food.preparation,
      })),
    })),
    recipes: recipes.map((recipe) => {
      const perRecipe = recipe.ingredients.map((ingredient) => {
        try {
          return sumNutrition([{ ...ingredient.food, ...scaleSafe(ingredient.food, ingredient.quantity, ingredient.unit) }]);
        } catch {
          return { ...EMPTY };
        }
      });
      const total = perRecipe.length ? sumNutrition(perRecipe) : { ...EMPTY };
      return {
        id: recipe.id,
        name: recipe.name,
        servings: recipe.servings,
        notes: recipe.notes,
        calories: total.calories,
        proteinG: total.proteinG,
        ingredients: recipe.ingredients.map((ingredient) => ({
          id: ingredient.id,
          foodId: ingredient.foodId,
          name: ingredient.food.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        })),
      };
    }),
    frequent: [...signatures.values()].filter((row) => row.count >= 2).slice(0, 6),
    frequentFoodIds: [...frequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([foodId]) => foodId),
    history: Array.from({ length: 14 }, (_, index) => {
      const key = addDaysKey(date, -index);
      const row = byDate.get(key);
      return { date: key, calories: row?.calories ?? null, proteinG: row?.proteinG ?? null };
    }),
    calendar,
    sodiumIncomplete: meals.some((meal) => meal.items.some((item) => !item.hasSodium)),
    sodiumMg: consumed.sodiumMg,
  };
}

function scaleSafe(food: Parameters<typeof serializeFood>[0], quantity: number, unit: string): MacroSnapshot {
  return scaleNutrition(food, quantity, unit);
}

export async function getFoodLibrary() {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const foods = await prisma.food.findMany({ orderBy: { name: "asc" } });
  const recipes = await prisma.recipe.findMany({ include: { ingredients: true }, orderBy: { name: "asc" } });
  return {
    ready: true as const,
    settings: base.settings,
    foods: foods.map(serializeFood),
    usdaConfigured: Boolean(base.settings.usdaApiKey || process.env.USDA_API_KEY),
    recipes,
  };
}

export async function getWorkouts() {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const plan = await prisma.trainingPlan.findFirst({
    where: { isActive: true },
    include: { days: { include: { exercises: true } } },
  });
  const sessions = await prisma.workoutSession.findMany({
    orderBy: { startedAt: "desc" },
    take: 40,
    include: { exercises: { include: { sets: true, exercise: true } } },
  });
  const cardio = await prisma.cardioSession.findMany({ orderBy: { date: "desc" }, take: 30 });
  const exercises = await prisma.exercise.findMany({ orderBy: { name: "asc" } });
  const today = base.today;
  const day = plan?.days.find((row) => row.dayOfWeek === dayOfWeek(today));
  return {
    ready: true as const,
    settings: base.settings,
    today,
    todayLabel: displayDate(today),
    planDay: day ? { id: day.id, name: day.name, exerciseCount: day.exercises.length } : null,
    active: sessions.find((session) => session.status !== "completed") ?? null,
    sessions: sessions.map((session) => ({
      id: session.id,
      date: session.date,
      name: session.name,
      status: session.status,
      sets: session.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
      volumeKg: totalVolumeKg(session.exercises.flatMap((exercise) => exercise.sets)),
    })),
    cardio: cardio.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      pace: row.distanceKm ? paceSecondsPerKm(row.durationSeconds, row.distanceKm) : null,
      speed: row.distanceKm ? speedKmh(row.distanceKm, row.durationSeconds) : null,
    })),
    exercises: exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      equipment: exercise.equipment,
      exerciseType: exercise.exerciseType,
      tracksLoad: exercise.tracksLoad,
    })),
  };
}

export async function getWorkout(id: string) {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const session = await prisma.workoutSession.findUnique({
    where: { id },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } },
      },
    },
  });
  if (!session) return { ready: true as const, missing: true as const, settings: base.settings };
  const library = await prisma.exercise.findMany({ orderBy: { name: "asc" } });
  const exerciseIds = session.exercises.map((row) => row.exerciseId);
  const history = await prisma.exerciseSet.findMany({
    where: {
      workoutExercise: { exerciseId: { in: exerciseIds }, session: { status: "completed", id: { not: session.id } } },
    },
    include: { workoutExercise: { include: { session: true } } },
    orderBy: { createdAt: "desc" },
  });

  const previous = new Map<string, { date: string; sets: { weight: number | null; weightUnit: string; reps: number | null; setType: string }[]; bestWeightKg: number | null; bestReps: number | null; bestEstimateKg: number | null }>();
  for (const exerciseId of exerciseIds) {
    const rows = history.filter((set) => set.workoutExercise.exerciseId === exerciseId);
    const latestSession = rows[0]?.workoutExercise.sessionId;
    const latest = rows.filter((set) => set.workoutExercise.sessionId === latestSession);
    const working = rows.filter((set) => set.setType !== "warmup" && set.weight != null);
    const bestWeight = working.reduce((max, set) => Math.max(max, toKg(set.weight as number, set.weightUnit)), 0);
    const bestReps = working.reduce((max, set) => Math.max(max, set.reps ?? 0), 0);
    const exercise = session.exercises.find((row) => row.exerciseId === exerciseId)?.exercise;
    const estimates = exercise && canEstimate1RM(exercise)
      ? working
          .map((set) => (set.reps ? estimateEpley1RM(toKg(set.weight as number, set.weightUnit), set.reps) : null))
          .filter((value): value is number => value != null)
      : [];
    previous.set(exerciseId, {
      date: latest[0]?.workoutExercise.session.date ?? "",
      sets: latest.map((set) => ({ weight: set.weight, weightUnit: set.weightUnit, reps: set.reps, setType: set.setType })),
      bestWeightKg: bestWeight || null,
      bestReps: bestReps || null,
      bestEstimateKg: estimates.length ? Math.max(...estimates) : null,
    });
  }

  return {
    ready: true as const,
    missing: false as const,
    settings: base.settings,
    library: library.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      secondaryMuscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      tracksLoad: exercise.tracksLoad,
      exerciseType: exercise.exerciseType,
    })),
    session: {
      id: session.id,
      date: session.date,
      name: session.name,
      status: session.status,
      notes: session.notes,
      startedAt: session.startedAt.toISOString(),
      finishedAt: session.finishedAt?.toISOString() ?? null,
      pausedAt: session.pausedAt?.toISOString() ?? null,
      accumulatedPauseMs: session.accumulatedPauseMs,
      exercises: session.exercises.map((row) => ({
        id: row.id,
        notes: row.notes,
        exercise: {
          id: row.exercise.id,
          name: row.exercise.name,
          primaryMuscle: row.exercise.primaryMuscle,
          equipment: row.exercise.equipment,
          exerciseType: row.exercise.exerciseType,
          tracksLoad: row.exercise.tracksLoad,
          instructions: row.exercise.instructions,
        },
        previous: previous.get(row.exerciseId) ?? null,
        sets: row.sets.map((set) => ({
          ...set,
          createdAt: set.createdAt.toISOString(),
          volumeKg: setVolumeKg(set),
          estimateKg:
            canEstimate1RM(row.exercise) && set.weight != null && set.reps != null && set.setType !== "warmup"
              ? estimateEpley1RM(toKg(set.weight, set.weightUnit), set.reps)
              : null,
        })),
      })),
    },
  };
}

export async function getPlans() {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const plan = await prisma.trainingPlan.findFirst({
    where: { isActive: true },
    include: {
      days: {
        include: { exercises: { include: { exercise: true }, orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  const exercises = await prisma.exercise.findMany({ orderBy: { name: "asc" } });
  const days = WEEKDAYS.map((weekday) => {
    const day = plan?.days.find((row) => row.dayOfWeek === weekday.day);
    return {
      weekday: weekday.label,
      dayOfWeek: weekday.day,
      id: day?.id ?? "",
      name: day?.name ?? weekday.label,
      focus: day?.focus ?? "",
      notes: day?.notes ?? "",
      exercises: day?.exercises.map((row) => ({
        id: row.id,
        exerciseId: row.exerciseId,
        name: row.exercise.name,
        targetSets: row.targetSets,
        targetReps: row.targetReps,
        notes: row.notes,
      })) ?? [],
    };
  });
  return {
    ready: true as const,
    planName: plan?.name ?? "No active plan",
    planNotes: plan?.notes ?? "",
    days,
    exercises: exercises.map((exercise) => ({ id: exercise.id, name: exercise.name, primaryMuscle: exercise.primaryMuscle })),
  };
}

export async function getBody() {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const [weights, measurements, photos] = await Promise.all([
    prisma.bodyWeightEntry.findMany({ orderBy: { weighedAt: "asc" } }),
    prisma.bodyMeasurement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.progressPhoto.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const series = representativeByDate(weights.map((row) => ({
    date: row.date, value: row.weightKg, at: row.weighedAt.toISOString(), isRepresentative: row.isRepresentative,
  })));
  const latest = series.at(-1) ?? null;
  const photosEnabled = process.env.NODE_ENV !== "production" || process.env.FORGE_PRIVATE_DEPLOYMENT === "true";
  return {
    ready: true as const,
    settings: base.settings,
    today: base.today,
    profile: base.profile,
    latest,
    average7: latest ? sevenDayAverage(series, latest.date) : null,
    weekly: changeFromPriorPoint(series, 7),
    monthly: changeFromPriorPoint(series, 30),
    points: series.map((row) => ({ date: row.date.slice(5), kg: Math.round(row.value * 10) / 10, fullDate: row.date })),
    weights: [...weights].reverse().slice(0, 30).map((row) => ({
      id: row.id, date: row.date, weightKg: row.weightKg, notes: row.notes, isRepresentative: row.isRepresentative,
      weighedAt: row.weighedAt.toISOString(),
    })),
    measurements: [...measurements].reverse().map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    waistPoints: measurements.filter((row) => row.waistCm != null).map((row) => ({ date: row.date.slice(5), cm: row.waistCm as number })),
    photos: photos.map((photo) => ({ ...photo, createdAt: photo.createdAt.toISOString() })),
    photosEnabled,
  };
}

export async function getHyrox() {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const sessions = await prisma.hyroxSession.findMany({
    orderBy: { createdAt: "desc" },
    include: { segments: { orderBy: { sortOrder: "asc" } } },
  });
  const flat = sessions.flatMap((session) => session.segments.map((segment) => ({ ...segment, date: session.date, sessionName: session.name })));
  const bests = HYROX_STATIONS.map((station) => ({
    ...station,
    best: bestEffort(
      flat.filter((segment) => segment.station === station.id),
      { meters: station.officialMeters, reps: station.officialReps },
    ),
  }));
  return {
    ready: true as const,
    today: base.today,
    settings: base.settings,
    bests,
    sessions: sessions.map((session) => {
      const running = session.segments.filter((segment) => segment.segmentType === "run").reduce((sum, segment) => sum + (segment.durationSeconds ?? 0), 0);
      const stations = session.segments.filter((segment) => segment.segmentType === "station").reduce((sum, segment) => sum + (segment.durationSeconds ?? 0), 0);
      const rest = session.segments.filter((segment) => segment.segmentType === "rest").reduce((sum, segment) => sum + (segment.durationSeconds ?? 0), 0);
      const recorded = session.segments.reduce((sum, segment) => sum + (segment.durationSeconds ?? 0), 0);
      const completeTiming = session.segments.every((segment) => (segment.durationSeconds ?? 0) > 0);
      return {
        id: session.id,
        date: session.date,
        name: session.name,
        kind: session.kind,
        notes: session.notes,
        isCompleteSimulation: session.isCompleteSimulation,
        running,
        stations,
        rest,
        recorded,
        completeTiming,
        segments: session.segments,
      };
    }),
  };
}

export async function getGoals() {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const [goals, weights, measurements] = await Promise.all([
    prisma.goal.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.bodyWeightEntry.findMany({ orderBy: { weighedAt: "asc" } }),
    prisma.bodyMeasurement.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const series = representativeByDate(weights.map((row) => ({
    date: row.date, value: row.weightKg, at: row.weighedAt.toISOString(), isRepresentative: row.isRepresentative,
  })));
  const latestWeight = series.at(-1)?.value ?? null;
  const latestWaist = [...measurements].reverse().find((row) => row.waistCm != null)?.waistCm ?? null;
  return {
    ready: true as const,
    today: base.today,
    goals: goals.map((goal) => {
      const current = goal.category === "weight" ? latestWeight : goal.category === "waist" ? latestWaist : goal.currentValue;
      return {
        ...goal,
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
        resolvedCurrent: current,
        progress: goalProgress({
          direction: goal.direction,
          startingValue: goal.startingValue,
          targetValue: goal.targetValue,
          currentValue: current,
        }),
      };
    }),
  };
}

export async function getAnalytics() {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const [weights, measurements, meals, sets, cardio, hyrox, sessions, steps, water] = await Promise.all([
    prisma.bodyWeightEntry.findMany({ orderBy: { weighedAt: "asc" } }),
    prisma.bodyMeasurement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.mealEntry.findMany({ include: { items: true }, orderBy: { date: "asc" } }),
    prisma.exerciseSet.findMany({
      where: { workoutExercise: { session: { status: "completed" } } },
      include: { workoutExercise: { include: { exercise: true, session: true } } },
    }),
    prisma.cardioSession.findMany({ orderBy: { date: "asc" } }),
    prisma.hyroxSegment.findMany({ include: { session: true } }),
    prisma.workoutSession.findMany({ where: { status: "completed" } }),
    prisma.stepEntry.findMany(),
    prisma.waterEntry.findMany(),
  ]);
  const weightSeries = representativeByDate(weights.map((row) => ({
    date: row.date, value: row.weightKg, at: row.weighedAt.toISOString(), isRepresentative: row.isRepresentative,
  })));
  const weightChart = weightSeries.map((row, index, all) => ({
    date: row.date.slice(5),
    fullDate: row.date,
    kg: Math.round(row.value * 10) / 10,
    avg: (() => {
      const slice = all.slice(Math.max(0, index - 6), index + 1);
      return Math.round((slice.reduce((sum, item) => sum + item.value, 0) / slice.length) * 10) / 10;
    })(),
  }));
  const weeklyChange = [];
  for (let index = 7; index < weightSeries.length; index += 1) {
    const delta = weightSeries[index].value - weightSeries[index - 7].value;
    weeklyChange.push({ date: weightSeries[index].date.slice(5), kg: Math.round(delta * 10) / 10 });
  }
  const nutritionByDate = new Map<string, MacroSnapshot>();
  for (const meal of meals) {
    const current = nutritionByDate.get(meal.date) ?? { ...EMPTY };
    nutritionByDate.set(meal.date, sumNutrition([current, ...meal.items]));
  }
  const nutrition = [...nutritionByDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, totals]) => ({
    date: date.slice(5),
    fullDate: date,
    calories: Math.round(totals.calories),
    protein: Math.round(totals.proteinG),
  }));
  const macroSource = [...nutritionByDate.values()];
  const macroSum = macroSource.length ? sumNutrition(macroSource) : { ...EMPTY };
  const percents = macroPercents(macroSum.proteinG, macroSum.carbsG, macroSum.fatG);
  const lifts = new Map<string, Map<string, { estimate: number; volume: number }>>();
  const muscleVolume = new Map<string, number>();
  for (const set of sets) {
    const name = set.workoutExercise.exercise.name;
    const date = set.workoutExercise.session.date;
    const volume = setVolumeKg(set);
    muscleVolume.set(set.workoutExercise.exercise.primaryMuscle, (muscleVolume.get(set.workoutExercise.exercise.primaryMuscle) ?? 0) + volume);
    if (!lifts.has(name)) lifts.set(name, new Map());
    const sessionsForLift = lifts.get(name)!;
    const current = sessionsForLift.get(date) ?? { estimate: 0, volume: 0 };
    current.volume += volume;
    if (canEstimate1RM(set.workoutExercise.exercise) && set.weight != null && set.reps != null && set.setType !== "warmup") {
      const estimate = estimateEpley1RM(toKg(set.weight, set.weightUnit), set.reps);
      if (estimate != null) current.estimate = Math.max(current.estimate, estimate);
    }
    sessionsForLift.set(date, current);
  }
  const liftSeries = [...lifts.entries()].map(([name, byDate]) => ({
    name,
    points: [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({
      date: date.slice(5),
      estimate: value.estimate ? Math.round(value.estimate * 10) / 10 : null,
      volume: Math.round(value.volume),
    })),
  }));
  const runs = [
    ...cardio.filter((row) => RUN_ACTIVITIES.has(row.activity) && row.distanceKm).map((row) => ({
      date: row.date, distanceKm: row.distanceKm as number, durationSeconds: row.durationSeconds, activity: row.activity,
    })),
    ...hyrox.filter((row) => row.segmentType === "run" && row.distanceM && row.durationSeconds).map((row) => ({
      date: row.session.date, distanceKm: (row.distanceM as number) / 1000, durationSeconds: row.durationSeconds as number, activity: "hyrox_run",
    })),
  ];
  const distanceByDate = new Map<string, number>();
  for (const run of runs) distanceByDate.set(run.date, (distanceByDate.get(run.date) ?? 0) + run.distanceKm);
  const weekDistance = new Map<string, number>();
  for (const [date, distance] of distanceByDate) {
    const week = format(startOfWeek(dateFromKey(date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    weekDistance.set(week, (weekDistance.get(week) ?? 0) + distance);
  }
  const erg = (station: string) =>
    hyrox
      .filter((row) => row.station === station && row.distanceM && row.durationSeconds)
      .map((row) => ({
        date: row.session.date.slice(5),
        pace: paceSecondsPerKm(row.durationSeconds as number, (row.distanceM as number) / 1000),
      }))
      .filter((row) => row.pace != null);

  const loggedFoodDays = new Set(meals.filter((meal) => meal.items.length).map((meal) => meal.date));
  const loggedWeightDays = new Set(weightSeries.map((row) => row.date));
  const workoutDays = new Set(sessions.map((session) => session.date));

  return {
    ready: true as const,
    settings: base.settings,
    weightChart,
    waist: measurements.filter((row) => row.waistCm != null).map((row) => ({ date: row.date.slice(5), cm: row.waistCm as number })),
    weeklyChange,
    nutrition,
    percents,
    nutritionDays: nutrition.length,
    lifts: liftSeries,
    muscles: [...muscleVolume.entries()].map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) })).filter((row) => row.volume > 0),
    runDistance: [...distanceByDate.entries()].map(([date, km]) => ({ date: date.slice(5), km: Math.round(km * 100) / 100 })),
    weeklyRun: [...weekDistance.entries()].map(([week, km]) => ({ week: week.slice(5), km: Math.round(km * 100) / 100 })),
    fastest1k: fastestNearDistance(runs, 1, 0.05),
    fastest5k: fastestNearDistance(runs, 5, 0.1),
    longest: runs.reduce<{ distanceKm: number; date: string } | null>((best, run) => (!best || run.distanceKm > best.distanceKm ? { distanceKm: run.distanceKm, date: run.date } : best), null),
    averagePace: average(runs.map((run) => paceSecondsPerKm(run.durationSeconds, run.distanceKm)).filter((value): value is number => value != null)),
    cardioMinutes: [...cardio.reduce((map, row) => {
      const week = format(startOfWeek(dateFromKey(row.date), { weekStartsOn: 1 }), "MM-dd");
      map.set(week, (map.get(week) ?? 0) + row.durationSeconds / 60);
      return map;
    }, new Map<string, number>())].map(([week, minutes]) => ({ week, minutes: Math.round(minutes) })),
    skierg: erg("skierg"),
    rowing: erg("rowing"),
    consistency: {
      workouts: workoutDays.size,
      foodDays: loggedFoodDays.size,
      weightDays: loggedWeightDays.size,
      stepDays: new Set(steps.map((row) => row.date)).size,
      waterDays: new Set(water.map((row) => row.date)).size,
    },
  };
}

export async function getSettings() {
  const base = await bootstrap();
  if (!base.ready) return { ready: false as const };
  const targets = await prisma.nutritionTarget.findMany({ orderBy: { effectiveFrom: "desc" } });
  return { ...base, targets };
}
