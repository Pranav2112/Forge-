import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInsights,
  estimateEpley1RM,
  macroPercents,
  paceSecondsPerKm,
  remaining,
  representativeByDate,
  scaleNutrition,
  sevenDayAverage,
  sumNutrition,
  toCm,
  toKg,
  toKm,
  totalVolumeKg,
} from "../src/lib/calc";
import { FOODS, PROTEIN_OATMEAL } from "../src/lib/seed/catalog";
import { mapOffProduct, mapUsdaFoundationFood } from "../src/lib/food-search";
import { checksumOf, stableStringify, toCsv } from "../src/lib/backup";

const whey = FOODS.find((food) => food.key === "whey");
assert.ok(whey);

describe("food scaling", () => {
  it("scales whey from the 32 g label to 48 g", () => {
    const scaled = scaleNutrition(whey, 48, "g");
    assert.equal(scaled.calories, 180);
    assert.equal(scaled.proteinG, 36);
    assert.equal(scaled.carbsG, 4.5);
    assert.equal(scaled.fatG, 3);
    assert.equal(scaled.bcaaG, 8.25);
    assert.ok((scaled.proteinG ?? 0) < 36 + (scaled.bcaaG ?? 0));
    const oneScoop = scaleNutrition(whey, 32, "g");
    assert.equal(oneScoop.calories, 120);
    assert.equal(oneScoop.proteinG, 24);
    assert.equal(oneScoop.sodiumMg, 130);
  });

  it("treats one serving as the defined serving", () => {
    const scaled = scaleNutrition(whey, 1.5, "serving");
    assert.equal(scaled.proteinG, 36);
  });

  it("builds protein oatmeal from ingredient records", () => {
    const items = PROTEIN_OATMEAL.items.map((item) => {
      const food = FOODS.find((row) => row.key === item.key);
      assert.ok(food);
      return scaleNutrition(food, item.quantity, item.unit);
    });
    const total = sumNutrition(items);
    assert.equal(items[2].proteinG, 36);
    assert.ok(total.calories > 380 && total.calories < 390);
    assert.ok(total.proteinG > 40 && total.proteinG < 42);
    assert.equal(Math.round(remaining(2100, total.calories)), 2100 - Math.round(total.calories));
  });

  it("does not treat dry and cooked rice as the same record", () => {
    const rice = FOODS.find((food) => food.key === "rice");
    const chunks = FOODS.find((food) => food.key === "soy-chunks");
    assert.equal(rice?.preparation, "cooked");
    assert.equal(chunks?.preparation, "dry");
  });
});

describe("daily macros", () => {
  it("sums a day and reports calories remaining", () => {
    const day = sumNutrition([
      { calories: 400, proteinG: 30, carbsG: 40, fatG: 12, fiberG: 5, sugarG: 8, sodiumMg: 100 },
      { calories: 600, proteinG: 45, carbsG: 50, fatG: 20, fiberG: 4, sugarG: 6, sodiumMg: 80 },
    ]);
    assert.equal(day.calories, 1000);
    assert.equal(day.proteinG, 75);
    assert.equal(remaining(2100, day.calories), 1100);
    const split = macroPercents(day.proteinG, day.carbsG, day.fatG);
    assert.ok(split.protein > 0 && split.carbs > 0 && split.fat > 0);
  });
});

describe("units and body averages", () => {
  it("converts pounds, inches, and miles", () => {
    assert.ok(Math.abs(toKg(220.46226218, "lb") - 100) < 0.001);
    assert.equal(toCm(37, "in"), 37 * 2.54);
    assert.ok(Math.abs(toKm(1, "mi") - 1.609344) < 0.000001);
  });

  it("averages the representative weight for seven days", () => {
    const series = representativeByDate([
      { date: "2026-11-01", value: 96, at: "2026-11-01T08:00:00.000Z", isRepresentative: false },
      { date: "2026-11-01", value: 95.5, at: "2026-11-01T07:00:00.000Z", isRepresentative: true },
      { date: "2026-11-02", value: 95.4, at: "2026-11-02T07:00:00.000Z", isRepresentative: true },
      { date: "2026-11-03", value: 95.2, at: "2026-11-03T07:00:00.000Z", isRepresentative: true },
    ]);
    assert.equal(series[0].value, 95.5);
    assert.equal(sevenDayAverage(series, "2026-11-03"), (95.5 + 95.4 + 95.2) / 3);
    assert.equal(sevenDayAverage([], "2026-11-03"), null);
  });
});

describe("strength", () => {
  it("sums working-set volume in kilograms and skips warm-ups", () => {
    const volume = totalVolumeKg([
      { weight: 60, weightUnit: "kg", reps: 10, setType: "warmup" },
      { weight: 80, weightUnit: "kg", reps: 5, setType: "working" },
      { weight: 100, weightUnit: "lb", reps: 5, setType: "working" },
    ]);
    assert.equal(volume, 400 + toKg(100, "lb") * 5);
  });

  it("estimates a 1RM with Epley and refuses cardio-style inputs", () => {
    assert.equal(estimateEpley1RM(100, 1), 100);
    assert.ok(Math.abs((estimateEpley1RM(100, 5) ?? 0) - (100 * (1 + 5 / 30))) < 0.001);
    assert.equal(estimateEpley1RM(100, 13), null);
    assert.equal(estimateEpley1RM(0, 5), null);
  });
});

describe("pace and insights", () => {
  it("computes pace only with distance and time", () => {
    assert.equal(paceSecondsPerKm(300, 1), 300);
    assert.equal(paceSecondsPerKm(300, 0), null);
  });

  it("does not invent an insight without records", () => {
    const insights = buildInsights({
      weightEntries: [],
      today: "2026-11-07",
      latestWeightKg: null,
      proteinAvg7: null,
      proteinDays: 0,
      proteinTarget: 180,
      calorieAvg7: null,
      calorieDays: 0,
      calorieTarget: 2100,
      workoutsCompleted: 0,
      workoutsPlanned: 0,
      benchDeltaKg: null,
      paceDeltaSec: null,
    });
    assert.equal(insights.length, 1);
    assert.match(insights[0].text, /Log meals/);
  });
});

describe("external food mapping", () => {
  it("rejects Open Food Facts products that are missing macros", () => {
    assert.equal(mapOffProduct({ product_name: "Mystery bar", nutriments: { "energy-kcal_100g": 100 } }), null);
  });

  it("maps a complete Open Food Facts product per 100 g", () => {
    const food = mapOffProduct({
      product_name: "Oat drink",
      brands: "Example",
      code: "123",
      nutriments: { "energy-kcal_100g": 45, proteins_100g: 1, carbohydrates_100g: 7, fat_100g: 1.5 },
    });
    assert.equal(food?.calories, 45);
    assert.equal(food?.servingSize, 100);
  });

  it("skips branded USDA foods", () => {
    assert.equal(mapUsdaFoundationFood({ description: "Branded milk", dataType: "Branded", foodNutrients: [] }), null);
  });
});

describe("backup format", () => {
  it("is stable and escapes csv", () => {
    assert.equal(stableStringify({ b: 1, a: 2 }), stableStringify({ a: 2, b: 1 }));
    assert.equal(checksumOf({ a: 1 }).length, 64);
    assert.match(toCsv(["note"], [["he said \"hi\""]]), /"he said ""hi"""/);
  });
});
