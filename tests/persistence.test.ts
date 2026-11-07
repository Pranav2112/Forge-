import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { buildBackup, importBackup } from "../src/lib/backup";

let db: PrismaClient;
let url: string;

before(() => {
  const dir = mkdtempSync(path.join(tmpdir(), "forge-test-"));
  url = `file:${path.join(dir, "test.db")}`;
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  db = new PrismaClient({ datasources: { db: { url } } });
});

after(async () => {
  await db.$disconnect();
});

describe("workout persistence", () => {
  it("keeps sets after a new read", async () => {
    const exercise = await db.exercise.create({
      data: {
        name: "Test Bench",
        primaryMuscle: "Chest",
        equipment: "Barbell",
        exerciseType: "strength",
        tracksLoad: true,
      },
    });
    const session = await db.workoutSession.create({
      data: {
        date: "2026-11-07",
        name: "Push",
        status: "active",
        exercises: { create: [{ exerciseId: exercise.id, sortOrder: 0 }] },
      },
      include: { exercises: true },
    });
    const set = await db.exerciseSet.create({
      data: {
        workoutExerciseId: session.exercises[0].id,
        setNumber: 1,
        weight: 70,
        weightUnit: "kg",
        reps: 6,
        setType: "working",
      },
    });
    const again = await db.exerciseSet.findUnique({ where: { id: set.id } });
    const reloaded = await db.workoutSession.findUnique({
      where: { id: session.id },
      include: { exercises: { include: { sets: true } } },
    });
    assert.equal(again?.reps, 6);
    assert.equal(reloaded?.status, "active");
    assert.equal(reloaded?.exercises[0].sets[0].weight, 70);
  });
});

describe("backup import", () => {
  it("exports, merges without duplicating, and rejects the same file twice", async () => {
    await db.userProfile.create({
      data: {
        id: "default",
        name: "Pranav Auti",
        age: 23,
        sex: "Male",
        heightCm: 178,
        diet: "Lacto-vegetarian",
        allowedFoods: "[]",
        excludedFoods: "[]",
        baselineWeightKg: 96,
        baselineWaistCm: 93.98,
        abdominalDefinition: "None",
      },
    });
    await db.userSettings.create({ data: { id: "default" } });
    const food = await db.food.create({
      data: {
        name: "Test oats",
        servingSize: 100,
        servingUnit: "g",
        calories: 379,
        proteinG: 13,
        carbsG: 67,
        fatG: 6,
        source: "test",
      },
    });
    const file = await buildBackup(db);
    const first = await importBackup(db, file, { mode: "merge", allowDuplicate: false });
    assert.equal(first.ok, true);
    const foodsAfter = await db.food.count({ where: { id: food.id } });
    assert.equal(foodsAfter, 1);
    const second = await importBackup(db, file, { mode: "merge", allowDuplicate: false });
    assert.equal(second.ok, false);
    if (!second.ok) assert.match(second.error, /already imported/);
  });
});
