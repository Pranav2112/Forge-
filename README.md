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

## Sign-in and cloud database

Production uses Supabase Postgres and Supabase email-and-password auth. Public signup stays off. The existing owner activates that same account once from Create account, using a setup code from `node --env-file=.env scripts/arm-owner-activation.mjs`. Registration then closes. Change the password in Settings after signing in. The original SQLite file stays on this machine and is not deleted.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `ALLOWED_EMAIL` — the only account that can open the records
- `DATABASE_URL` — pooled Postgres URL
- `DIRECT_URL` — session Postgres URL used by Prisma
- `FORGE_REQUIRE_AUTH=true` on any public host that is not Vercel

The publishable key is public and is used only for sign-in. Fitness rows are read through the server. `prisma/supabase-lock.sql` enables row level security with no public policies. Do not put a secret or service-role key in any `NEXT_PUBLIC_` variable. Leave `FORGE_PRIVATE_DEPLOYMENT` false. Progress photos stay on the local disk.

## Deferred

- USDA branded foods
- A dedicated side-by-side photo viewer (photos are a private grid)
- AI-generated insights (insights are rules over stored records)
- Medical advice or automatic calorie cuts
