import { prisma } from "@/lib/prisma";

export async function activationIsOpen() {
  try {
    const settings = await prisma.userSettings.findUnique({ where: { id: "default" } });
    if (!settings?.activationCodeHash || !settings.activationExpiresAt) return false;
    return settings.activationExpiresAt.getTime() > Date.now();
  } catch {
    return false;
  }
}
