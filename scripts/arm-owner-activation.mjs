#!/usr/bin/env node
// Arms a 30-minute setup code for the existing owner. Does not set or print a password.

import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error("Run this in your own terminal. Nothing was changed.");
  process.exit(1);
}

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const bytes = randomBytes(16);
let raw = "";
for (const byte of bytes) raw += alphabet[byte % alphabet.length];
const code = raw.match(/.{4}/g).join("-");
const hash = createHash("sha256").update(raw).digest("hex");
const prisma = new PrismaClient();

try {
  await prisma.userSettings.update({
    where: { id: "default" },
    data: {
      activationCodeHash: hash,
      activationExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      activationAttempts: 0,
    },
  });
} finally {
  await prisma.$disconnect();
}

console.log("Owner activation is open for 30 minutes.");
console.log("Open https://forge-fitness-os.vercel.app/signup");
console.log("Setup code:");
console.log(code);
