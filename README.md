# Sticker Status Direct

Online custom-sticker store for Sticker Status (Boise, Idaho). See `CLAUDE.md` for the brief and `docs/build-plan.md` for the plan and progress.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install      # first time only
npm run dev      # then open http://localhost:3000
```

## Database (Supabase)

1. Copy `.env.example` to `.env.local` and paste your Supabase connection string into `DATABASE_URL`
   (Supabase → Project Settings → Database → Connection string → **Transaction pooler**, with your database password filled in).
2. `npm run db:migrate` creates the tables (safe to run again; it only applies new changes).
3. `npm run db:seed` loads the prototype's sample customers and orders. Add `ADMIN_EMAIL=you@example.com` to `.env.local` to also get an admin account.
   `npm run db:seed -- --reset` wipes everything and reloads the samples. **Wipe the sample data before launch.**

Changing the schema: edit `src/server/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`, then `npm run db:migrate`.

## Checks (run before calling a step done)

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Where things live

| What | File |
|---|---|
| Products, sizes, quantities, materials, extras, shipping | `src/lib/catalog.ts` |
| Placeholder pricing formula (replace with real pricing) | `src/lib/pricing.ts` + `src/lib/pricing.test.ts` |
| Sticker preview drawing | `src/lib/sticker-svg.ts` |
| Brand colors, fonts, component styles | `src/app/globals.css` |
| Pages | `src/app/(shop)/…` |
| Database tables | `src/server/db/schema.ts` (migrations in `drizzle/`) |
| Order status rules and actions (send proof, approve, …) | `src/lib/status.ts`, `src/server/orders.ts` |
| Sample data | `src/server/db/seed-data.ts` |
