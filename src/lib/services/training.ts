import { canEstimate1RM, estimateEpley1RM, toKg } from "@/lib/calc";
import { prisma } from "@/lib/prisma";
import { fail, prismaMessage } from "@/lib/result";
import { cardioSchema, setSchema } from "@/lib/validators";

export async function startWorkout(input: { date: string; planDayId?: string | null; name?: string }) {
  const active = await prisma.workoutSession.findFirst({
    where: { status: { in: ["active", "paused"] } },
  });
  if (active) {
    return fail("Finish the workout already in progress before starting another.");
  }

  let name = input.name?.trim() || "Workout";
  let exercises: { exerciseId: string; sortOrder: number }[] = [];
  if (input.planDayId) {
    const day = await prisma.trainingPlanDay.findUnique({
      where: { id: input.planDayId },
      include: { exercises: { orderBy: { sortOrder: "asc" } } },
    });
    if (!day) return fail("That training day no longer exists.");
    if (!input.name?.trim()) name = day.name;
    exercises = day.exercises.map((exercise, index) => ({
      exerciseId: exercise.exerciseId,
      sortOrder: index,
    }));
  }

  const session = await prisma.workoutSession.create({
    data: {
      date: input.date,
      name,
      planDayId: input.planDayId || null,
      status: "active",
      exercises: { create: exercises },
    },
  });
  return { ok: true as const, data: { id: session.id } };
}

export async function setWorkoutStatus(input: { id: string; action: "pause" | "resume" | "finish"; notes?: string }) {
  const session = await prisma.workoutSession.findUnique({ where: { id: input.id } });
  if (!session) return fail("That workout is gone.");
  if (session.status === "completed") return fail("This workout is already finished.");

  if (input.action === "pause") {
    if (session.status === "paused") return { ok: true as const };
    await prisma.workoutSession.update({
      where: { id: session.id },
      data: { status: "paused", pausedAt: new Date() },
    });
    return { ok: true as const };
  }

  if (input.action === "resume") {
    if (session.status !== "paused" || !session.pausedAt) return { ok: true as const };
    const extra = Math.max(0, Date.now() - session.pausedAt.getTime());
    await prisma.workoutSession.update({
      where: { id: session.id },
      data: {
        status: "active",
        pausedAt: null,
        accumulatedPauseMs: session.accumulatedPauseMs + extra,
      },
    });
    return { ok: true as const };
  }

  let accumulated = session.accumulatedPauseMs;
  if (session.status === "paused" && session.pausedAt) {
    accumulated += Math.max(0, Date.now() - session.pausedAt.getTime());
  }
  await prisma.workoutSession.update({
    where: { id: session.id },
    data: {
      status: "completed",
      finishedAt: new Date(),
      pausedAt: null,
      accumulatedPauseMs: accumulated,
      notes: input.notes?.slice(0, 2000) ?? session.notes,
    },
  });
  return { ok: true as const };
}

export async function updateWorkoutMeta(input: { id: string; name?: string; notes?: string }) {
  await prisma.workoutSession.update({
    where: { id: input.id },
    data: {
      ...(input.name != null ? { name: input.name.trim().slice(0, 120) || "Workout" } : {}),
      ...(input.notes != null ? { notes: input.notes.slice(0, 2000) } : {}),
    },
  });
  return { ok: true as const };
}

export async function addExerciseToWorkout(input: { sessionId: string; exerciseId: string }) {
  const session = await prisma.workoutSession.findUnique({
    where: { id: input.sessionId },
    include: { exercises: true },
  });
  if (!session || session.status === "completed") return fail("Open a workout before adding an exercise.");
  const exercise = await prisma.exercise.findUnique({ where: { id: input.exerciseId } });
  if (!exercise) return fail("That exercise is not in the library.");
  const sortOrder = session.exercises.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
  const created = await prisma.workoutExercise.create({
    data: { sessionId: session.id, exerciseId: exercise.id, sortOrder },
  });
  return { ok: true as const, data: { id: created.id } };
}

export async function removeWorkoutExercise(id: string) {
  await prisma.workoutExercise.delete({ where: { id } });
  return { ok: true as const };
}

export async function addSet(input: unknown) {
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the set.");
  const parent = await prisma.workoutExercise.findUnique({
    where: { id: parsed.data.workoutExerciseId },
    include: { exercise: true, session: true, sets: true },
  });
  if (!parent || parent.session.status === "completed") return fail("This workout is not open for logging.");

  const data = parsed.data;
  if (parent.exercise.tracksLoad && data.setType !== "warmup") {
    if (data.weight == null || data.reps == null) {
      return fail("Enter weight and reps for this set.");
    }
  }
  if (!parent.exercise.tracksLoad && data.durationSeconds == null && data.reps == null && data.distanceM == null) {
    return fail("Enter a duration, distance, or reps.");
  }

  const setNumber = parent.sets.reduce((max, set) => Math.max(max, set.setNumber), 0) + 1;
  const created = await prisma.exerciseSet.create({
    data: {
      workoutExerciseId: parent.id,
      setNumber,
      weight: data.weight ?? null,
      weightUnit: data.weightUnit,
      reps: data.reps ?? null,
      rpe: data.rpe ?? null,
      rir: data.rir ?? null,
      setType: data.setType,
      durationSeconds: data.durationSeconds ?? null,
      distanceM: data.distanceM ?? null,
      notes: data.notes,
      completed: true,
    },
  });

  let estimatedPr = false;
  if (
    canEstimate1RM(parent.exercise) &&
    data.weight != null &&
    data.reps != null &&
    data.setType !== "warmup"
  ) {
    const current = estimateEpley1RM(toKg(data.weight, data.weightUnit), data.reps);
    if (current != null) {
      const previous = await prisma.exerciseSet.findMany({
        where: {
          id: { not: created.id },
          setType: { not: "warmup" },
          workoutExercise: {
            exerciseId: parent.exerciseId,
            session: { status: "completed" },
          },
        },
      });
      const best = previous.reduce((max, set) => {
        if (set.weight == null || set.reps == null) return max;
        const estimate = estimateEpley1RM(toKg(set.weight, set.weightUnit), set.reps);
        if (estimate == null) return max;
        return Math.max(max, estimate);
      }, 0);
      estimatedPr = previous.length === 0 || current > best + 0.05;
    }
  }

  return { ok: true as const, data: { id: created.id, estimatedPr } };
}

export async function deleteSet(id: string) {
  const set = await prisma.exerciseSet.findUnique({ where: { id } });
  if (!set) return { ok: true as const };
  await prisma.exerciseSet.delete({ where: { id } });
  const rest = await prisma.exerciseSet.findMany({
    where: { workoutExerciseId: set.workoutExerciseId },
    orderBy: { setNumber: "asc" },
  });
  await Promise.all(
    rest.map((row, index) =>
      prisma.exerciseSet.update({ where: { id: row.id }, data: { setNumber: index + 1 } }),
    ),
  );
  return { ok: true as const };
}

export async function deleteWorkout(id: string) {
  await prisma.workoutSession.delete({ where: { id } });
  return { ok: true as const };
}

export async function saveExercise(input: {
  id?: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  exerciseType: string;
  instructions: string;
  demoUrl: string;
  notes: string;
  tracksLoad: boolean;
}) {
  const name = input.name.trim();
  if (!name) return fail("Name the exercise.");
  const data = {
    name,
    primaryMuscle: input.primaryMuscle,
    secondaryMuscles: JSON.stringify(input.secondaryMuscles),
    equipment: input.equipment.trim(),
    exerciseType: input.exerciseType,
    instructions: input.instructions.trim(),
    demoUrl: input.demoUrl.trim(),
    notes: input.notes.trim(),
    tracksLoad: input.tracksLoad,
  };
  try {
    if (input.id) await prisma.exercise.update({ where: { id: input.id }, data });
    else await prisma.exercise.create({ data });
    return { ok: true as const };
  } catch (error) {
    return fail(prismaMessage(error, "Could not save that exercise."));
  }
}

export async function updatePlanDay(input: {
  id: string;
  name: string;
  focus: string;
  notes: string;
}) {
  await prisma.trainingPlanDay.update({
    where: { id: input.id },
    data: {
      name: input.name.trim() || "Training",
      focus: input.focus.trim(),
      notes: input.notes.slice(0, 2000),
    },
  });
  return { ok: true as const };
}

export async function addPlannedExercise(input: {
  dayId: string;
  exerciseId: string;
  targetSets: number | null;
  targetReps: string;
  notes: string;
}) {
  const day = await prisma.trainingPlanDay.findUnique({
    where: { id: input.dayId },
    include: { exercises: true },
  });
  if (!day) return fail("That day is gone.");
  const sortOrder = day.exercises.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
  await prisma.plannedExercise.create({
    data: {
      dayId: day.id,
      exerciseId: input.exerciseId,
      sortOrder,
      targetSets: input.targetSets,
      targetReps: input.targetReps,
      notes: input.notes,
    },
  });
  return { ok: true as const };
}

export async function updatePlannedExercise(input: {
  id: string;
  targetSets: number | null;
  targetReps: string;
  notes: string;
}) {
  await prisma.plannedExercise.update({
    where: { id: input.id },
    data: {
      targetSets: input.targetSets,
      targetReps: input.targetReps,
      notes: input.notes,
    },
  });
  return { ok: true as const };
}

export async function removePlannedExercise(id: string) {
  await prisma.plannedExercise.delete({ where: { id } });
  return { ok: true as const };
}

export async function logCardio(input: unknown) {
  const parsed = cardioSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the cardio entry.");
  await prisma.cardioSession.create({ data: parsed.data });
  return { ok: true as const };
}

export async function deleteCardio(id: string) {
  await prisma.cardioSession.delete({ where: { id } });
  return { ok: true as const };
}
