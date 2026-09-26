# Sticker Status Direct — project brief

StickerStatusDirect.com is an online custom-sticker store run by Sticker Status (wraps, tint and PPF shop in Boise, Idaho).
Customers configure stickers, upload artwork (or buy design help), pay, approve a digital proof, and track the order through production and shipping.

## Reference material in this repo
- `docs/prototype.html`: the approved V1 clickable prototype. It is the source of truth for **look, copy, flow and data shapes**. Open it in a browser. Port it faithfully; don't redesign it unless asked.
- `docs/requirements.md`: the owner's original feature spec.

## Stack (unless the owner says otherwise)
- Next.js (App Router) + TypeScript + Tailwind
- Postgres via Supabase (database, auth, file storage) and Prisma or Drizzle for the schema
- Stripe Checkout / Payment Intents for payment
- Resend or Postmark for email
- Deploy on Vercel

## Brand
- Black `#0D0B0B`, white, red accent `#E1102B`. Tokens are in the prototype's `:root`.
- Fonts: Big Shoulders Display (headlines, uppercase), Archivo (body), JetBrains Mono (labels, order numbers).
- Mobile first. The order tracker is horizontal on desktop and vertical on mobile.
- Keep printing jargon out of the customer side.

## Things to lift directly from the prototype
- `CATALOG`: products, shapes, sizes, quantity tiers, materials, extras, design fee, shipping methods. Move this to the database or a config file.
- `PRICING` + `calculatePrice(cfg)`: placeholder formula. Keep it as one pure, unit-tested function the owner can replace. Price is always recalculated on the server; never trust the browser's number.
- `STATUS`, `STAGE_OF`, `STAGES`: order statuses, admin labels and the 8 customer tracker stages.
- `stickerSVG()`: the live sticker preview (shape, material sheen, die-cut outline).

## Order lifecycle
received → review → proof_ready ⇄ changes_requested → approved → production (Queued/Printing/Laminating/Cutting) → qc → ready_to_ship → shipped → delivered

Rules:
- Proofs are versioned (v1, v2, …). The customer approves or requests changes with a note.
- On approval: record the timestamp, lock that proof as the production artwork (it can't be edited or replaced after that), set the due date (3 business days, or 1 for rush) and move to production automatically.
- Every status change writes an activity-log entry and notifies the customer when the change is customer-facing.

## Core tables (suggested)
customers, orders, order_items, files (artwork and proofs, stored in object storage), proofs, order_events (activity log), internal_notes, shipments, notifications.

## Build order
1. Scaffold, design tokens, layout, homepage, shop, configurator with live pricing (no backend)
2. Database schema + seed data matching the prototype's sample orders
3. Auth, customer account, order detail, tracker
4. Artwork upload to storage (AI, EPS, SVG, PDF, PSD, PNG, JPG; size limits; file validation)
5. Stripe checkout + webhook that creates the order
6. Proofing flow (staff upload, customer approve/request changes) + emails
7. Admin dashboard (grouped by status, order drawer, notes, tracking)
8. Production queue (TV-friendly board, auto-refresh)
9. Reorder, SEO (one page per product, metadata, sitemap), accessibility pass

## Working rules
- Small commits per step; run lint, typecheck and tests before calling a step done.
- Staff pages (/admin, /production) require a staff role.
- Ask before choosing paid services or changing the pricing formula.
