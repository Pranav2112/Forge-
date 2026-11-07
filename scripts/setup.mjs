import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
}
mkdirSync("data/photos", { recursive: true });
execSync("npx prisma generate", { stdio: "inherit" });
execSync("npx prisma db push", { stdio: "inherit" });
execSync("npm run db:seed", { stdio: "inherit" });
console.log("\nFORGE is ready. Start it with npm run dev");
