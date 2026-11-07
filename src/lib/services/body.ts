import { HYROX_STATIONS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/result";
import { goalSchema, hyroxSchema, measurementSchema, profileSchema, settingsSchema, targetSchema, weightSchema } from "@/lib/validators";

function listJson(value: string) {
  return JSON.stringify(
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

export async function saveProfile(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the profile.");
  await prisma.userProfile.update({
    where: { id: "default" },
    data: {
      ...parsed.data,
      allowedFoods: listJson(parsed.data.allowedFoods),
      excludedFoods: listJson(parsed.data.excludedFoods),
    },
  });
  return { ok: true as const };
}

export async function saveTarget(input: unknown) {
  const parsed = targetSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the targets.");
  if (parsed.data.calories < 1200) {
    return fail("FORGE will not save a calorie target under 1,200 kcal. Pick a target you can reassess, not an extreme cut.");
  }
  const existing = await prisma.nutritionTarget.findFirst({
    where: { effectiveFrom: parsed.data.effectiveFrom },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await prisma.nutritionTarget.update({ where: { id: existing.id }, data: parsed.data });
  } else {
    await prisma.nutritionTarget.create({ data: parsed.data });
  }
  return { ok: true as const };
}

export async function saveSettings(input: unknown) {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the settings.");
  await prisma.userSettings.update({ where: { id: "default" }, data: parsed.data });
  return { ok: true as const };
}

export async function logWeight(input: unknown) {
  const parsed = weightSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the weight.");
  await prisma.$transaction(async (tx) => {
    if (parsed.data.representative) {
      await tx.bodyWeightEntry.updateMany({
        where: { date: parsed.data.date },
        data: { isRepresentative: false },
      });
    }
    await tx.bodyWeightEntry.create({
      data: {
        date: parsed.data.date,
        weightKg: parsed.data.weightKg,
        notes: parsed.data.notes,
        isRepresentative: parsed.data.representative,
      },
    });
  });
  return { ok: true as const };
}

export async function deleteWeight(id: string) {
  await prisma.bodyWeightEntry.delete({ where: { id } });
  return { ok: true as const };
}

export async function logMeasurement(input: unknown) {
  const parsed = measurementSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the measurements.");
  const data = parsed.data;
  const hasAny = [
    data.waistCm,
    data.chestCm,
    data.hipsCm,
    data.neckCm,
    data.leftArmCm,
    data.rightArmCm,
    data.leftThighCm,
    data.rightThighCm,
    data.leftCalfCm,
    data.rightCalfCm,
    data.bodyFatPercent,
  ].some((value) => value != null);
  if (!hasAny) return fail("Enter at least one measurement.");
  if (data.bodyFatPercent != null && !data.bodyFatMethod) {
    return fail("Mark body fat as measured or an estimate. FORGE will not invent one.");
  }
  await prisma.bodyMeasurement.create({
    data: {
      date: data.date,
      waistCm: data.waistCm ?? null,
      chestCm: data.chestCm ?? null,
      hipsCm: data.hipsCm ?? null,
      neckCm: data.neckCm ?? null,
      leftArmCm: data.leftArmCm ?? null,
      rightArmCm: data.rightArmCm ?? null,
      leftThighCm: data.leftThighCm ?? null,
      rightThighCm: data.rightThighCm ?? null,
      leftCalfCm: data.leftCalfCm ?? null,
      rightCalfCm: data.rightCalfCm ?? null,
      bodyFatPercent: data.bodyFatPercent ?? null,
      bodyFatMethod: data.bodyFatMethod,
      notes: data.notes,
    },
  });
  return { ok: true as const };
}

export async function deleteMeasurement(id: string) {
  await prisma.bodyMeasurement.delete({ where: { id } });
  return { ok: true as const };
}

export async function logWater(input: { date: string; amountMl: number }) {
  if (!Number.isInteger(input.amountMl) || input.amountMl <= 0 || input.amountMl > 5000) {
    return fail("Enter a water amount between 1 ml and 5,000 ml.");
  }
  await prisma.waterEntry.create({ data: { date: input.date, amountMl: input.amountMl } });
  return { ok: true as const };
}

export async function setSteps(input: { date: string; steps: number }) {
  if (!Number.isInteger(input.steps) || input.steps < 0 || input.steps > 200000) {
    return fail("Enter a step count between 0 and 200,000.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.stepEntry.deleteMany({ where: { date: input.date } });
    if (input.steps > 0) {
      await tx.stepEntry.create({ data: { date: input.date, steps: input.steps, notes: "Daily total" } });
    }
  });
  return { ok: true as const };
}

export async function addSteps(input: { date: string; steps: number }) {
  if (!Number.isInteger(input.steps) || input.steps <= 0 || input.steps > 100000) {
    return fail("Enter a step amount greater than zero.");
  }
  await prisma.stepEntry.create({ data: { date: input.date, steps: input.steps, notes: "Added" } });
  return { ok: true as const };
}

export async function saveGoal(input: unknown) {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the goal.");
  const data = {
    name: parsed.data.name,
    category: parsed.data.category,
    direction: parsed.data.direction,
    startingValue: parsed.data.startingValue ?? null,
    targetValue: parsed.data.targetValue ?? null,
    currentValue: parsed.data.currentValue ?? null,
    unit: parsed.data.unit,
    startText: parsed.data.startText,
    targetText: parsed.data.targetText,
    startDate: parsed.data.startDate,
    targetDate: parsed.data.targetDate ?? null,
    status: parsed.data.status,
    notes: parsed.data.notes,
  };
  if (parsed.data.id) await prisma.goal.update({ where: { id: parsed.data.id }, data });
  else await prisma.goal.create({ data });
  return { ok: true as const };
}

export async function deleteGoal(id: string) {
  await prisma.goal.delete({ where: { id } });
  return { ok: true as const };
}

export async function logHyrox(input: unknown) {
  const parsed = hyroxSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the HYROX entry.");
  const officialStations = HYROX_STATIONS.filter((station) => station.id !== "run").map((station) => station.id);
  const stations = new Set(
    parsed.data.segments.filter((segment) => segment.segmentType === "station").map((segment) => segment.station),
  );
  const runs = parsed.data.segments.filter((segment) => segment.segmentType === "run").length;
  const timed = parsed.data.segments.every((segment) => (segment.durationSeconds ?? 0) > 0);
  const complete =
    parsed.data.kind === "simulation" &&
    timed &&
    runs >= 8 &&
    officialStations.every((station) => stations.has(station));

  await prisma.hyroxSession.create({
    data: {
      date: parsed.data.date,
      name: parsed.data.name,
      kind: parsed.data.kind,
      notes: parsed.data.notes,
      isCompleteSimulation: complete,
      segments: {
        create: parsed.data.segments.map((segment, index) => ({
          sortOrder: index,
          segmentType: segment.segmentType,
          station: segment.segmentType === "run" ? "run" : segment.station || "",
          distanceM: segment.distanceM ?? null,
          reps: segment.reps ?? null,
          weightKg: segment.weightKg ?? null,
          durationSeconds: segment.durationSeconds ?? null,
          notes: segment.notes,
        })),
      },
    },
  });
  return { ok: true as const, data: { isCompleteSimulation: complete } };
}

export async function deleteHyrox(id: string) {
  await prisma.hyroxSession.delete({ where: { id } });
  return { ok: true as const };
}
