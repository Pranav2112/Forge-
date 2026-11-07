const target = process.env.POSTGRES_URL;
if (!target || !target.startsWith("postgres")) {
  console.error("Set POSTGRES_URL to the Supabase Postgres connection string, then run this again.");
  console.error("The local SQLite file is left untouched.");
  process.exit(1);
}

console.error("This script is intentionally not automatic.");
console.error("1. Back up data/forge.db.");
console.error("2. Point a throwaway Prisma command at POSTGRES_URL and run: npx prisma db push");
console.error("3. Import the JSON backup from Settings, or write a one-time copy that upserts by id.");
console.error("4. Compare table counts with the backup counts file before using the cloud database.");
console.error("5. Run prisma/supabase-lock.sql in the Supabase SQL editor.");
process.exit(1);
