import { addDaysKey, isDateKey } from "@/lib/dates";
import { CM_PER_INCH, KM_PER_MILE, LB_PER_KG } from "@/lib/constants";

export type MacroSnapshot = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  saturatedFatG?: number;
  cholesterolMg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
  bcaaG?: number;
};

export type ScalableFood = MacroSnapshot & {
  servingSize: number;
  servingUnit: string;
  gramsPerServing: number | null;
};

const EMPTY_MACROS: MacroSnapshot = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0,
};

export function roundTo(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function scaleFactor(input: {
  quantity: number;
  inputUnit: string;
  servingSize: number;
  servingUnit: string;
  gramsPerServing: number | null;
}): number {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }
  if (!Number.isFinite(input.servingSize) || input.servingSize <= 0) {
    throw new Error("Serving size must be greater than zero.");
  }

  const unit = input.inputUnit.trim().toLowerCase();
  const servingUnit = input.servingUnit.trim().toLowerCase();

  if (unit === "serving" || unit === "servings") {
    return input.quantity;
  }

  if (unit === servingUnit) {
    return input.quantity / input.servingSize;
  }

  const massUnit = unit === "g" || unit === "ml";
  if (massUnit && input.gramsPerServing && input.gramsPerServing > 0) {
    return input.quantity / input.gramsPerServing;
  }

  throw new Error(`Can't convert ${input.inputUnit} for a food measured in ${input.servingUnit}.`);
}

export function scaleNutrition(food: ScalableFood, quantity: number, inputUnit: string): MacroSnapshot {
  const factor = scaleFactor({
    quantity,
    inputUnit,
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    gramsPerServing: food.gramsPerServing,
  });
  const extra = food as ScalableFood & {
    saturatedFatG?: number;
    cholesterolMg?: number;
    calciumMg?: number;
    ironMg?: number;
    potassiumMg?: number;
    bcaaG?: number;
  };
  return {
    calories: food.calories * factor,
    proteinG: food.proteinG * factor,
    carbsG: food.carbsG * factor,
    fatG: food.fatG * factor,
    fiberG: food.fiberG * factor,
    sugarG: food.sugarG * factor,
    sodiumMg: food.sodiumMg * factor,
    saturatedFatG: (extra.saturatedFatG ?? 0) * factor,
    cholesterolMg: (extra.cholesterolMg ?? 0) * factor,
    calciumMg: (extra.calciumMg ?? 0) * factor,
    ironMg: (extra.ironMg ?? 0) * factor,
    potassiumMg: (extra.potassiumMg ?? 0) * factor,
    bcaaG: (extra.bcaaG ?? 0) * factor,
  };
}

export function sumNutrition(items: MacroSnapshot[]): MacroSnapshot {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      proteinG: total.proteinG + item.proteinG,
      carbsG: total.carbsG + item.carbsG,
      fatG: total.fatG + item.fatG,
      fiberG: total.fiberG + item.fiberG,
      sugarG: total.sugarG + item.sugarG,
      sodiumMg: total.sodiumMg + item.sodiumMg,
    }),
    { ...EMPTY_MACROS },
  );
}

export function remaining(target: number, consumed: number): number {
  return target - consumed;
}

export function macroPercents(proteinG: number, carbsG: number, fatG: number) {
  const proteinKcal = proteinG * 4;
  const carbKcal = carbsG * 4;
  const fatKcal = fatG * 9;
  const total = proteinKcal + carbKcal + fatKcal;
  if (total <= 0) {
    return { protein: 0, carbs: 0, fat: 0, kcalFromMacros: 0 };
  }
  return {
    protein: (proteinKcal / total) * 100,
    carbs: (carbKcal / total) * 100,
    fat: (fatKcal / total) * 100,
    kcalFromMacros: total,
  };
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function toKg(value: number, unit: string): number {
  const normalized = unit.toLowerCase();
  if (normalized === "kg") return value;
  if (normalized === "lb" || normalized === "lbs") return value / LB_PER_KG;
  throw new Error(`Unknown weight unit ${unit}.`);
}

export function fromKg(kg: number, unit: string): number {
  const normalized = unit.toLowerCase();
  if (normalized === "kg") return kg;
  if (normalized === "lb" || normalized === "lbs") return kg * LB_PER_KG;
  throw new Error(`Unknown weight unit ${unit}.`);
}

export function toCm(value: number, unit: string): number {
  const normalized = unit.toLowerCase();
  if (normalized === "cm") return value;
  if (normalized === "in" || normalized === "inch" || normalized === "inches") return value * CM_PER_INCH;
  throw new Error(`Unknown length unit ${unit}.`);
}

export function fromCm(cm: number, unit: string): number {
  const normalized = unit.toLowerCase();
  if (normalized === "cm") return cm;
  if (normalized === "in" || normalized === "inch" || normalized === "inches") return cm / CM_PER_INCH;
  throw new Error(`Unknown length unit ${unit}.`);
}

export function toKm(value: number, unit: string): number {
  const normalized = unit.toLowerCase();
  if (normalized === "km") return value;
  if (normalized === "mi" || normalized === "mile" || normalized === "miles") return value * KM_PER_MILE;
  throw new Error(`Unknown distance unit ${unit}.`);
}

export function fromKm(km: number, unit: string): number {
  const normalized = unit.toLowerCase();
  if (normalized === "km") return km;
  if (normalized === "mi" || normalized === "mile" || normalized === "miles") return km / KM_PER_MILE;
  throw new Error(`Unknown distance unit ${unit}.`);
}

export type DailyWeight = { date: string; value: number };

export function representativeByDate(
  entries: { date: string; value: number; at: string; isRepresentative: boolean }[],
): DailyWeight[] {
  const byDate = new Map<string, { date: string; value: number; at: string; isRepresentative: boolean }>();
  for (const entry of entries) {
    const current = byDate.get(entry.date);
    if (!current) {
      byDate.set(entry.date, entry);
      continue;
    }
    if (entry.isRepresentative && !current.isRepresentative) {
      byDate.set(entry.date, entry);
      continue;
    }
    if (entry.isRepresentative === current.isRepresentative && entry.at > current.at) {
      byDate.set(entry.date, entry);
    }
  }
  return [...byDate.values()]
    .map((entry) => ({ date: entry.date, value: entry.value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function valuesInWindow(entries: DailyWeight[], endDate: string, days: number): number[] {
  if (!isDateKey(endDate) || days < 1) return [];
  const start = addDaysKey(endDate, -(days - 1));
  return entries.filter((entry) => entry.date >= start && entry.date <= endDate).map((entry) => entry.value);
}

export function sevenDayAverage(entries: DailyWeight[], endDate: string): number | null {
  return average(valuesInWindow(entries, endDate, 7));
}

export function changeFromPriorPoint(entries: DailyWeight[], daysBack: number): number | null {
  if (entries.length === 0 || daysBack < 1) return null;
  const latest = entries[entries.length - 1];
  const cutoff = addDaysKey(latest.date, -daysBack);
  const prior = [...entries].reverse().find((entry) => entry.date <= cutoff);
  if (!prior || prior.date === latest.date) return null;
  return latest.value - prior.value;
}

export function windowAverageChange(entries: DailyWeight[], endDate: string, windowDays = 7): number | null {
  const current = average(valuesInWindow(entries, endDate, windowDays));
  const priorEnd = addDaysKey(endDate, -windowDays);
  const prior = average(valuesInWindow(entries, priorEnd, windowDays));
  if (current == null || prior == null) return null;
  return current - prior;
}

export function canEstimate1RM(exercise: { exerciseType: string; tracksLoad: boolean }): boolean {
  return exercise.tracksLoad && (exercise.exerciseType === "strength" || exercise.exerciseType === "core");
}

/** Epley estimate. Returns null when a 1RM would be misleading. */
export function estimateEpley1RM(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  if (weight <= 0 || reps < 1) return null;
  if (!Number.isInteger(reps)) return null;
  if (reps === 1) return weight;
  if (reps > 12) return null;
  return weight * (1 + reps / 30);
}

export type VolumeSet = {
  weight: number | null;
  weightUnit: string;
  reps: number | null;
  setType: string;
};

export function setVolumeKg(set: VolumeSet): number {
  if (set.setType === "warmup") return 0;
  if (set.weight == null || set.reps == null || set.reps <= 0 || set.weight <= 0) return 0;
  return toKg(set.weight, set.weightUnit) * set.reps;
}

export function totalVolumeKg(sets: VolumeSet[]): number {
  return sets.reduce((sum, set) => sum + setVolumeKg(set), 0);
}

export function paceSecondsPerKm(durationSeconds: number, distanceKm: number): number | null {
  if (!Number.isFinite(durationSeconds) || !Number.isFinite(distanceKm)) return null;
  if (durationSeconds <= 0 || distanceKm <= 0) return null;
  return durationSeconds / distanceKm;
}

export function speedKmh(distanceKm: number, durationSeconds: number): number | null {
  if (!Number.isFinite(durationSeconds) || !Number.isFinite(distanceKm)) return null;
  if (durationSeconds <= 0 || distanceKm < 0) return null;
  return distanceKm / (durationSeconds / 3600);
}

export function formatPace(secondsPerUnit: number): string {
  const rounded = Math.round(secondsPerUnit);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remain = seconds % 60;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${remain.toString().padStart(2, "0")}`;
  return `${minutes}:${remain.toString().padStart(2, "0")}`;
}

export function elapsedWorkoutMs(input: {
  startedAt: number;
  finishedAt: number | null;
  pausedAt: number | null;
  accumulatedPauseMs: number;
  status: string;
  now: number;
}): number {
  const end = input.status === "completed" && input.finishedAt != null ? input.finishedAt : input.now;
  const livePause = input.status === "paused" && input.pausedAt != null ? Math.max(0, end - input.pausedAt) : 0;
  return Math.max(0, end - input.startedAt - input.accumulatedPauseMs - livePause);
}

export function goalProgress(input: {
  direction: string;
  startingValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
}): number | null {
  const { direction, startingValue, targetValue, currentValue } = input;
  if (startingValue == null || targetValue == null || currentValue == null) return null;
  if (direction === "qualitative" || direction === "maintain") return null;
  const span = targetValue - startingValue;
  if (span === 0) return currentValue === targetValue ? 1 : 0;
  const raw = (currentValue - startingValue) / span;
  return Math.min(1, Math.max(0, raw));
}

export function bestEffort(
  efforts: { distanceM: number | null; reps: number | null; durationSeconds: number | null }[],
  target: { meters: number | null; reps: number | null },
): { durationSeconds: number } | null {
  let best: number | null = null;
  for (const effort of efforts) {
    if (effort.durationSeconds == null || effort.durationSeconds <= 0) continue;
    const meetsDistance = target.meters == null || (effort.distanceM != null && effort.distanceM + 0.5 >= target.meters);
    const meetsReps = target.reps == null || (effort.reps != null && effort.reps >= target.reps);
    if (!meetsDistance || !meetsReps) continue;
    if (best == null || effort.durationSeconds < best) best = effort.durationSeconds;
  }
  return best == null ? null : { durationSeconds: best };
}

export type Insight = {
  id: string;
  tone: "neutral" | "positive" | "caution";
  text: string;
};

export function buildInsights(input: {
  weightEntries: DailyWeight[];
  today: string;
  latestWeightKg: number | null;
  proteinAvg7: number | null;
  proteinDays: number;
  proteinTarget: number;
  calorieAvg7: number | null;
  calorieDays: number;
  calorieTarget: number;
  workoutsCompleted: number;
  workoutsPlanned: number;
  benchDeltaKg: number | null;
  paceDeltaSec: number | null;
}): Insight[] {
  const insights: Insight[] = [];
  const weightDelta = windowAverageChange(input.weightEntries, input.today, 7);
  const currentDays = valuesInWindow(input.weightEntries, input.today, 7).length;
  const priorDays = valuesInWindow(input.weightEntries, addDaysKey(input.today, -7), 7).length;

  if (weightDelta != null && currentDays >= 2 && priorDays >= 2) {
    const magnitude = Math.abs(weightDelta);
    if (magnitude < 0.05) {
      insights.push({
        id: "weight-flat",
        tone: "neutral",
        text: "Your average weight is about the same as the previous week.",
      });
    } else if (weightDelta < 0) {
      insights.push({
        id: "weight-down",
        tone: "positive",
        text: `Your average weight decreased by ${magnitude.toFixed(1)} kg compared with the previous week.`,
      });
    } else {
      insights.push({
        id: "weight-up",
        tone: "neutral",
        text: `Your average weight increased by ${magnitude.toFixed(1)} kg compared with the previous week.`,
      });
    }

    if (
      input.latestWeightKg != null &&
      weightDelta < 0 &&
      magnitude > input.latestWeightKg * 0.01
    ) {
      insights.push({
        id: "weight-rapid",
        tone: "caution",
        text: `That weekly drop is faster than about 1% of your latest body weight. It may be water, a steep deficit, or both. Reassess food, training, and sleep before changing the target further.`,
      });
    }
  }

  if (input.proteinAvg7 != null && input.proteinDays >= 3) {
    const rounded = Math.round(input.proteinAvg7);
    const gap = input.proteinTarget - input.proteinAvg7;
    insights.push({
      id: "protein",
      tone: gap > 15 ? "caution" : "neutral",
      text:
        gap > 15
          ? `Your protein intake averaged ${rounded} g over the last seven logged days, under the ${Math.round(input.proteinTarget)} g target.`
          : `Your protein intake averaged ${rounded} g over the last seven logged days.`,
    });
  }

  if (input.calorieAvg7 != null && input.calorieDays >= 3) {
    const rounded = Math.round(input.calorieAvg7);
    if (input.calorieAvg7 < input.calorieTarget * 0.75) {
      insights.push({
        id: "calories-low",
        tone: "caution",
        text: `Average intake is ${rounded} kcal, well below your ${input.calorieTarget} kcal target. FORGE will not suggest cutting further. Reassess energy, training quality, and whether this target still fits.`,
      });
    } else {
      insights.push({
        id: "calories",
        tone: "neutral",
        text: `Your calorie intake averaged ${rounded} kcal over the last seven logged days.`,
      });
    }
  }

  if (input.workoutsPlanned > 0) {
    insights.push({
      id: "adherence",
      tone: input.workoutsCompleted >= input.workoutsPlanned ? "positive" : "neutral",
      text: `You completed ${input.workoutsCompleted} of ${input.workoutsPlanned} planned workouts so far this week.`,
    });
  }

  if (input.benchDeltaKg != null && Math.abs(input.benchDeltaKg) >= 0.5) {
    if (input.benchDeltaKg > 0) {
      insights.push({
        id: "bench-up",
        tone: "positive",
        text: `Your bench press estimated 1RM is up ${input.benchDeltaKg.toFixed(1)} kg from the previous session. This is an Epley estimate, not a tested max.`,
      });
    } else {
      insights.push({
        id: "bench-down",
        tone: "neutral",
        text: `Your bench press estimated 1RM is ${Math.abs(input.benchDeltaKg).toFixed(1)} kg below the previous session. Estimates move around during a fat-loss phase.`,
      });
    }
  }

  if (input.paceDeltaSec != null && Math.abs(input.paceDeltaSec) >= 5) {
    if (input.paceDeltaSec < 0) {
      insights.push({
        id: "pace-up",
        tone: "positive",
        text: `Your average running pace is ${formatPace(Math.abs(input.paceDeltaSec))} per km faster than the previous month, across logged runs.`,
      });
    } else {
      insights.push({
        id: "pace-down",
        tone: "neutral",
        text: `Your average running pace is ${formatPace(input.paceDeltaSec)} per km slower than the previous month, across logged runs.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "empty",
      tone: "neutral",
      text: "Log meals, body weight, or training and FORGE will summarize only what you recorded.",
    });
  }

  return insights;
}

export function runningEstimateKcal(weightKg: number, distanceKm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(distanceKm)) return null;
  if (weightKg <= 0 || distanceKm <= 0) return null;
  return weightKg * distanceKm * 1.036;
}

export function fastestNearDistance(
  runs: { distanceKm: number; durationSeconds: number }[],
  targetKm: number,
  toleranceKm: number,
): { distanceKm: number; durationSeconds: number } | null {
  let best: { distanceKm: number; durationSeconds: number } | null = null;
  for (const run of runs) {
    if (Math.abs(run.distanceKm - targetKm) > toleranceKm) continue;
    if (run.durationSeconds <= 0) continue;
    if (!best || run.durationSeconds < best.durationSeconds) best = run;
  }
  return best;
}
