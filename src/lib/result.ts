import { Prisma } from "@prisma/client";

export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function prismaMessage(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "That name is already in use.";
    if (error.code === "P2003") {
      return "This is still used by a meal, recipe, plan, or workout, so it was kept.";
    }
    if (error.code === "P2025") return "That record is no longer there.";
  }
  return fallback;
}
