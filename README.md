# Sticker Status Direct

Online custom-sticker store for Sticker Status (Boise, Idaho). See `CLAUDE.md` for the brief and `docs/build-plan.md` for the plan and progress.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install      # first time only
npm run dev      # then open http://localhost:3000
```

## Database (Supabase)

**On Vercel (no setup on your computer):** every production deploy runs `scripts/deploy-db.ts` first, which applies new migrations.
Set these in Vercel → Settings → Environment Variables (Production):
- `DATABASE_URL`: Supabase Transaction pooler connection string, password filled in
- `SEED_SAMPLE_DATA=true` (optional) loads the sample orders once, when there are no orders yet. Remove it after.
- `ADMIN_EMAIL` (optional) gives that email an admin account when the sample data loads

**On your computer:**

1. Copy `.env.example` to `.env.local` and paste your Supabase connection string into `DATABASE_URL`
   (Supabase → Project Settings → Database → Connection string → **Transaction pooler**, with your database password filled in).
2. `npm run db:migrate` creates the tables (safe to run again; it only applies new changes).
3. `npm run db:seed` loads the prototype's sample customers and orders. Add `ADMIN_EMAIL=you@example.com` to `.env.local` to also get an admin account.
   `npm run db:seed -- --reset` wipes everything and reloads the samples. **Wipe the sample data before launch.**

Changing the schema: edit `src/server/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`, then `npm run db:migrate`.

## Payments (Stripe)

Set in Vercel → Settings → Environment Variables:
- `STRIPE_SECRET_KEY`: Stripe → Developers → API keys → Secret key (`sk_test_…` while testing)
- `STRIPE_WEBHOOK_SECRET`: Stripe → Developers → Webhooks → endpoint `https://<your-site>/api/stripe/webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded` → Signing secret (`whsec_…`)

Without `STRIPE_SECRET_KEY` the checkout button stays disabled. Test card: 4242 4242 4242 4242, any future date, any CVC.
Locally, `stripe listen --forward-to localhost:3000/api/stripe/webhook` (Stripe CLI) prints a webhook secret to use in `.env.local`.

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
