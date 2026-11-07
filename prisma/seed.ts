import { PrismaClient } from "@prisma/client";
import { seedIfEmpty } from "../src/lib/seed/run";

const prisma = new PrismaClient();

seedIfEmpty(prisma)
  .then((result) => {
    console.log(result.seeded ? "Seeded FORGE." : "Profile already exists. Left your data alone.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
