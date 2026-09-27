# Sticker Status Direct — build plan

Status: **step 2 done in code** (schema, migrations, sample data, order rules). Applied automatically by Vercel production builds (`vercel-build` → `scripts/deploy-db.ts`) once `DATABASE_URL` is set in Vercel. Next: step 3.

Step 2 notes:
- Drizzle ORM, schema in `src/server/db/schema.ts`, migrations in `drizzle/` (`0001_rules.sql` is hand-written: proof lock triggers, `updated_at`, lowercase emails, RLS on with no policies).
- One `customers` table for everyone who signs in, with a `role` (customer/staff/admin). `auth_user_id` links a Supabase Auth user on first sign-in (step 3). Seed can create an admin via `ADMIN_EMAIL`.
- All order changes go through `src/server/orders.ts` (transitionOrder, sendProof, requestChanges, approveProof). Allowed moves are `TRANSITIONS` in `src/lib/status.ts`; a `cancelled` status was added.
- Due dates: 5pm Boise time, 3 business days after approval (1 for rush), `src/lib/dates.ts`. Holidays aren't skipped yet.
- Seeded files and proofs point at placeholder art (`files.sample_art`) instead of real storage objects.
- Tests run against in-memory Postgres (PGlite), so `npm test` needs no database.


Step 1 notes:
- Next.js 16, React 19, Tailwind 4, Vitest. Prototype CSS is ported into `src/app/globals.css`; brand tokens are also Tailwind colors.
- Uploaded files stay in the browser for now (name, size, small image preview). Real uploads to storage are step 4.
- Checkout shows the full form but "Place order" is disabled until Stripe (step 5). Track Order and Account are short "coming soon" pages until step 3.
- Quote form on /business doesn't send yet (needs the database/email steps).
- Added after the prototype (owner request): customers can resize/move uploaded artwork on the preview (not for die cut; saved as `artFit` on the cart item, to be stored on order items in step 2), and a print-sharpness check on PNG/JPG uploads with a blurry-print warning (`src/lib/artwork.ts`, thresholds in `QUALITY`).
- Image enhancement add-on (owner request): flat `CATALOG.enhanceFee` ($5) per design, offered when a PNG/JPG is uploaded and marked Recommended when it may print soft/blurry. Stored as `enhance` on the item; staff run the file through Topaz Gigapixel (show this in the admin order drawer in step 7).
- Already added early: per-product pages with metadata and JSON-LD, sitemap.xml, robots.txt.

Sources: `CLAUDE.md` (brief), `docs/prototype.html` (look, copy, flow, data shapes), `docs/requirements.md` (spec).

---

## 1. Folder structure

```
stickers-status-direct/
├─ CLAUDE.md
├─ docs/                       prototype.html, requirements.md, this plan
├─ drizzle/                    generated SQL migrations (checked in)
├─ public/                     fonts fallback, og images, favicons
├─ scripts/
│  └─ seed.ts                  loads the prototype's 15 sample orders + customers
├─ src/
│  ├─ app/
│  │  ├─ (shop)/               public site, shares header/footer layout
│  │  │  ├─ page.tsx                     homepage (hero, how it works, products, why, gallery, reviews, bulk, FAQ, CTA)
│  │  │  ├─ stickers/page.tsx            shop: all products
│  │  │  ├─ stickers/[slug]/page.tsx     configurator, one SEO page per product
│  │  │  ├─ business/page.tsx            bulk orders + quote form
│  │  │  ├─ cart/page.tsx
│  │  │  ├─ checkout/page.tsx
│  │  │  ├─ checkout/success/page.tsx    order confirmation
│  │  │  ├─ track/page.tsx               order # + email lookup
│  │  │  ├─ login/page.tsx
│  │  │  └─ account/
│  │  │     ├─ page.tsx                  tabs: orders, proofs, account info
│  │  │     └─ orders/[number]/page.tsx  order detail, tracker, proof approve/changes, reorder
│  │  ├─ (staff)/              staff-only layout; middleware checks role
│  │  │  ├─ admin/page.tsx               orders grouped by status + order drawer
│  │  │  └─ production/page.tsx          TV board, auto-refresh
│  │  ├─ api/
│  │  │  ├─ stripe/webhook/route.ts      creates the order on payment
│  │  │  └─ uploads/route.ts             issues signed upload URLs, validates files
│  │  ├─ sitemap.ts, robots.ts
│  │  └─ layout.tsx            fonts, tokens, metadata
│  ├─ components/
│  │  ├─ ui/                   Button, Card, Pill, Field, Modal, Toast …
│  │  ├─ sticker/StickerPreview.tsx      port of stickerSVG()
│  │  ├─ configurator/         ShapePicker, SizePicker, QtyTiles, MaterialPicker, Extras, ArtworkDrop, PriceBox, MobileBar
│  │  ├─ tracker/Tracker.tsx   8 stages, horizontal desktop / vertical mobile
│  │  ├─ proof/                ProofSheet, ApproveDialog, ChangesForm
│  │  └─ admin/                OrderTable, OrderDrawer, NotesPanel, TrackingForm, ProductionCard
│  ├─ lib/                     pure, shared by browser and server, unit-tested
│  │  ├─ catalog.ts            CATALOG (products, shapes, sizes, qty tiers, materials, extras, design fee, shipping, tax)
│  │  ├─ pricing.ts            PRICING + calculatePrice(cfg)  ← the one function the owner replaces
│  │  ├─ dims.ts               dims(), dimLabel()
│  │  ├─ status.ts             STATUS, STAGES, STAGE_OF, PROD_STEPS, allowed transitions
│  │  ├─ dates.ts              addBusinessDays(), due-date rule
│  │  ├─ money.ts, format.ts
│  │  └─ art.ts                placeholder sticker art from the prototype
│  ├─ server/                  server-only code
│  │  ├─ db/schema.ts, db/client.ts
│  │  ├─ orders.ts             transition(order, to, actor): the only way status changes
│  │  ├─ proofs.ts             send, approve (lock), request changes
│  │  ├─ checkout.ts           reprices cart, creates Stripe session
│  │  ├─ storage.ts            Supabase Storage helpers, signed URLs
│  │  ├─ auth.ts               session, requireCustomer(), requireStaff()
│  │  └─ email/                provider client + templates (proof ready, changes received, shipped …)
│  ├─ styles/globals.css       brand tokens from the prototype :root
│  └─ middleware.ts            protects /account, /admin, /production
├─ tests/
│  ├─ unit/                    pricing, dims, dates, status transitions (Vitest)
│  └─ e2e/                     customer order → proof → approve; staff flow (Playwright)
├─ .env.example                names of every key, no values
└─ package.json
```

Conventions: money stored and computed in **integer cents**; the browser shows `calculatePrice` for instant feedback but the server always recomputes it. The cart lives in the browser (like the prototype) until checkout, so there's no carts table.

---

## 2. Database schema (Postgres on Supabase, Drizzle ORM)

**Recommendation: Drizzle over Prisma.** It's lighter on Vercel serverless, plays well with Supabase's connection pooler, and the schema reads like SQL. Tell me if you'd rather have Prisma.

Catalog (products, sizes, materials, etc.) stays in `src/lib/catalog.ts` for V1: it's versioned in Git and the pricing function needs it synchronously. It can move to a table later if you want to edit products without a deploy. Order items store a **snapshot** of every choice, so changing the catalog never changes old orders.

### Enums
| enum | values |
|---|---|
| `role` | customer, staff, admin |
| `order_status` | received, review, proof_ready, changes_requested, approved, production, qc, ready_to_ship, shipped, delivered, cancelled |
| `prod_stage` | queued, printing, laminating, cutting |
| `proof_status` | pending, approved, changes_requested, superseded |
| `file_kind` | artwork, reference, proof |
| `actor` | customer, staff, system |

### Tables

**profiles** (one row per Supabase Auth user)
`id` (= auth.users.id), `email`, `name`, `phone`, `company`, `role` default customer, `default_address` jsonb, `created_at`

**orders**
`id` uuid · `number` text unique (`SSD-1061`, from a Postgres sequence, continuing after the sample data) · `customer_id` → profiles · contact snapshot (`email`, `name`, `phone`, `company`) · `ship_address` jsonb · `bill_address` jsonb · `ship_method` · `subtotal_cents`, `shipping_cents`, `tax_cents`, `total_cents` · `status` · `prod_stage` (null unless in production) · `is_rush` · `approved_at` · `approved_proof_id` → proofs · `due_at` · `reorder_of` → orders · `stripe_session_id`, `stripe_payment_intent_id`, `payment_status`, `card_brand`, `card_last4` · `created_at`, `updated_at`

**order_items**
`id` · `order_id` · `product_id` (catalog slug) · `shape` · `size` (2–6 or null) · `custom_w`, `custom_h` · `width_in`, `height_in` (resolved) · `qty` · `material` · `laminate`, `rush` · `design_help`, `design_notes` · `price_cents` · `price_lines` jsonb (breakdown shown on receipt) · `pricing_version`

**files** (metadata; bytes live in Supabase Storage, private buckets)
`id` · `kind` · `bucket`, `path` · `original_name`, `mime`, `ext`, `size_bytes`, `sha256` · `order_id` / `order_item_id` (null until checkout attaches them) · `uploaded_by` · `created_at`. Unattached uploads older than 7 days are cleaned up.

**proofs**
`id` · `order_id` · `order_item_id` (nullable, see question 4) · `version` (unique per order: v1, v2 …) · `file_id` · `staff_message` · `status` · `customer_note` · `sent_by`, `sent_at` · `responded_at`.
**Lock:** a database trigger rejects any UPDATE/DELETE on an approved proof or its file row, so the production artwork can't be changed even by a bug or a staff member.

**order_events** (activity log; also drives the tracker timeline)
`id` · `order_id` · `status` (nullable for non-status events) · `text` · `actor`, `actor_id` · `customer_visible` · `created_at`

**internal_notes**
`id` · `order_id` · `author_id` · `text` · `created_at` (staff-only, never sent to the browser on customer pages)

**shipments**
`id` · `order_id` · `carrier` (USPS/UPS/FedEx) · `tracking_number` · `shipped_at` · `eta` · `delivered_at`

**notifications**
`id` · `customer_id` · `order_id` · `kind` · `title`, `body` · `read_at` · `emailed_at`, `email_message_id` · `created_at`

**stripe_events** (webhook idempotency)
`id` (Stripe event id) · `type` · `processed_at`

**quote_requests** (business page form)
`id` · `name`, `email`, `company`, `phone` · `details` · `created_at`

### Rules enforced on the server
- `transition(order, to, actor)` checks an allowed-transitions map, then in **one transaction**: updates the order, writes an `order_events` row, and if the change is customer-facing writes a `notifications` row and queues the email.
- Approving a proof, in one transaction: set proof approved + `responded_at`, mark older proofs superseded, set `orders.approved_at` / `approved_proof_id`, set `due_at` = 3 business days (1 if rush), log "approved", then move to `production` / `queued` and log that too.
- Supabase row-level security: customers can read only their own orders, items, proofs, events and shipments; staff can read and write everything; `internal_notes` is staff-only.

---

## 3. Step-by-step build plan

Each step ends with lint + typecheck + tests passing, a commit, and a click-through by you before the next step.

| # | Step | What you can click when it's done | Needs from you |
|---|---|---|---|
| 1 | **Scaffold + look + configurator (no backend).** Next.js, TypeScript, Tailwind, brand tokens and fonts. Header/footer, homepage, shop, business page, FAQ. Configurator with live pricing, `StickerPreview` port, cart in the browser. `catalog.ts`, `pricing.ts` with unit tests. Checkout page renders but "Place order" is disabled. | Whole public site, build a sticker, see the price move, add to cart | nothing |
| 2 | **Database schema + seed.** Drizzle schema, migrations, RLS policies, seed script with the prototype's 15 sample orders and customers (Jordan Reyes etc.). Status transition module + tests. | (behind the scenes) data in Supabase | Supabase project |
| 3 | **Auth, account, order detail, tracker.** Email login (magic link), account tabs, order detail with the 8-stage tracker, public Track Order page (order # + email), notifications bell. Staff role check on `/admin` and `/production`. | Log in as a sample customer, see orders and trackers | — |
| 4 | **Artwork upload.** Drag and drop, signed direct-to-storage uploads, type check by extension *and* file signature (AI, EPS, SVG, PDF, PSD, PNG, JPG), size limit, remove/replace, design-help notes + reference files. Image thumbnails in the preview. | Upload real files in the configurator | — |
| 5 | **Stripe checkout + webhook.** Server reprices the cart, Stripe Checkout (test mode), webhook creates the order, items, attaches files, logs "Order placed", sends the confirmation email. Idempotent. | Pay with 4242 test card, order appears in your account | Stripe test keys |
| 6 | **Proofing + emails.** Staff uploads proof vN with a message; customer gets "Your proof is ready!" email + bell; approve (with checkbox confirm) or request changes with a note; lock + due date + auto-move to production. | Full proof loop across two browsers | Email provider key + sending domain |
| 7 | **Admin dashboard.** Orders grouped by status, search, order drawer: customer info, items, artwork download, proof upload/history, change status, internal notes, tracking entry (sends "shipped" email), mark delivered. | Run an order end to end as staff | Staff user(s) to create |
| 8 | **Production queue.** TV board of approved/production/QC/ready-to-ship orders, big type, due-date colors, one-tap "next step" (Queued → Printing → Laminating → Cutting → QC → Ready to ship), auto-refresh. | Put it on a TV | — |
| 9 | **Reorder, SEO, accessibility.** Reorder loads the approved artwork and config, pick a new quantity. Per-product pages with metadata, Open Graph images, sitemap, robots, structured data. Keyboard/screen-reader pass, Playwright end-to-end tests, Vercel deploy. | Production-ready V1 on a Vercel URL | Vercel account, domain DNS |

Environment keys go in `.env.local` (never committed); `.env.example` lists the names.

---

## 4. Questions for you

Defaults are in bold; I'll use them unless you say otherwise.

1. **Login style.** The prototype creates an account at checkout. Default: **passwordless email link (magic link)**, optional password later. OK?
2. **Sales tax.** Prototype uses a flat 6% placeholder. Options: **keep flat Idaho 6% for V1**, or Stripe Tax (automatic, costs about 0.5% per transaction; a paid service, so your call).
3. **Email provider.** **Resend** (simple, free tier) or Postmark. Either needs a sending domain like `orders@stickerstatusdirect.com`.
4. **Proofs for multi-sticker orders.** The prototype has one proof per order. Default: **one proof per order** (a proof sheet can show several designs); the schema leaves room for one per item later.
5. **Upload limits.** Default: **100 MB per file, up to 10 files per sticker.**
6. **Order numbers.** Default: **keep the `SSD-####` format**, continuing from 1061.
7. **Production sub-steps (Printing/Laminating/Cutting).** Default: **staff-only**; the customer tracker just shows "In production" with no email per sub-step.
8. Already on your list, can wait: real pricing + design fee (right before launch), whether reorders with unchanged artwork skip the proof (**default: still get a proof**), monday.com (**default: production queue replaces it**; an integration can come later).
