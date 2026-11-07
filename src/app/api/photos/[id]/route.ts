import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { authRequired, currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  if (authRequired() && !(await currentUser())) return new Response("Not found", { status: 404 });
  if (process.env.NODE_ENV === "production" && process.env.FORGE_PRIVATE_DEPLOYMENT !== "true") {
    return new Response("Progress photos are disabled on this deployment.", { status: 403 });
  }
  const { id } = await context.params;
  if (!/^[\w-]+$/.test(id)) return new Response("Not found", { status: 404 });
  const photo = await prisma.progressPhoto.findUnique({ where: { id } });
  if (!photo) return new Response("Not found", { status: 404 });
  const filename = path.basename(photo.filename);
  if (!/^[\w.-]+$/.test(filename)) return new Response("Not found", { status: 404 });
  const root = path.resolve(process.cwd(), "data", "photos");
  const file = path.resolve(root, filename);
  if (!file.startsWith(root)) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(file);
    return new Response(bytes, {
      headers: {
        "Content-Type": photo.mimeType,
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("Photo file is missing.", { status: 404 });
  }
}
