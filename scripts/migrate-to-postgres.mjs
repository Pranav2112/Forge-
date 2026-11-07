console.error("Run scripts/copy-sqlite-to-postgres.mjs after DATABASE_URL points at Postgres.");
console.error("It inserts by id and skips rows that already exist. data/forge.db is not deleted.");
process.exit(0);
