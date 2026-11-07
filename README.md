# FORGE

Personal fitness tracker for daily nutrition, strength training, HYROX, running, body measurements, and goals. One local user. Data lives in SQLite.

## Setup

```bash
npm install
npm run setup
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

`npm run setup` copies `.env.example` to `.env` when needed, creates the SQLite database, and seeds the profile, foods, Protein Oatmeal template, exercise library, and weekly plan. Seeding again does not duplicate the profile.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Calculation, mapping, persistence, and backup tests |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply `prisma/schema.prisma` to the local database |
| `npm run db:seed` | Seed only if the profile is missing |

## Where data lives

- Database: `data/forge.db` (path is relative to `prisma/`, set by `DATABASE_URL`)
- Progress photos: `data/photos/` (jpeg, png, or webp, 8 MB max)
- Both directories are gitignored

The profile stores the 96 kg and 93.98 cm baselines. Charts stay empty until you log a real weigh-in or measurement. No past workouts are invented.

## Backup

Settings has export and import.

- JSON export is the full backup. It includes a checksum.
- CSV exports cover nutrition, workouts, and body weight.
- Import validates the file before writing.
- The same backup is rejected a second time unless you check “import even if this file was imported before.”
- Replace mode deletes current records first. You must type `REPLACE MY DATA`.

Copy `data/forge.db` and `data/photos/` if you want a file-level backup as well.

## Nutrition notes

Optimum Nutrition Gold Standard Whey uses the label: 32 g, 120 kcal, 24 g protein, 3 g carbohydrate, 2 g fat. Other foods are marked as a listed source or an estimate. Estimated values are labeled in the food library and on log rows. Meal items store a snapshot, so editing a food later does not change past days. Dry, raw, and cooked foods are separate records.

Open Food Facts search works without a key and skips products that are missing calories or macros. USDA FoodData Central search needs a key in Settings or `USDA_API_KEY`. Branded USDA foods are skipped. If the network or key is missing, local foods still work.

## Deploying later

SQLite is a file. A typical serverless host does not keep that file. Do not deploy this as-is to an ephemeral filesystem.

For a hosted copy:

1. Put the app on a server with a persistent disk, or switch Prisma `provider` to `postgresql` and point `DATABASE_URL` at Postgres.
2. Run `npx prisma db push` (or a migration) against that database and seed it.
3. Add real authentication before the app is reachable. There is no login in this local copy, and personal records must not sit on an unauthenticated public API.
4. Leave `FORGE_PRIVATE_DEPLOYMENT` false unless the deploy is private. Photo URLs return 403 in production until that flag is set, and even then they are not a public CDN.

## Sign-in and cloud database

Local `npm run dev` stays a single-user SQLite app. Nothing is served on Vercel until these environment variables are set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ALLOWED_EMAIL` — the only account that can sign in
- `DATABASE_URL` — Supabase Postgres connection string, replacing the SQLite URL
- `FORGE_REQUIRE_AUTH=true` on any public host that is not Vercel

Create the Supabase project, turn off public signups, run `prisma/supabase-lock.sql` in the SQL editor, then `npx prisma db push` against that database. Import a JSON backup from Settings and compare the counts with the private backup before you rely on it. `scripts/migrate-to-postgres.mjs` prints those steps and does not delete `data/forge.db`.

The anon key is public and is used only for sign-in. Fitness rows are read through the server. Row level security in `prisma/supabase-lock.sql` blocks the public Supabase API. Do not put the service-role key in any `NEXT_PUBLIC_` variable.

## Deferred

- Accounts and authentication
- A PostgreSQL migration (the schema uses portable Prisma types; the provider is still SQLite)
- USDA branded foods
- A dedicated side-by-side photo viewer (photos are a private grid)
- AI-generated insights (insights are rules over stored records)
- Medical advice or automatic calorie cuts
