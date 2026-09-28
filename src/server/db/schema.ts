/**
 * Database schema (Postgres on Supabase, via Drizzle ORM).
 *
 * Conventions
 * - Money is integer cents.
 * - Orders and items keep a snapshot of everything the customer chose, so later catalog or price changes never alter old orders.
 * - Row-level security is ON for every table with no policies: the browser can't read or write anything directly.
 *   All access goes through our server code, which checks who is asking (see drizzle/0001_rules.sql).
 * - Approved proofs and their files are locked by a database trigger (also in 0001_rules.sql).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { ArtFit } from "@/lib/artwork";
import type { PriceLine } from "@/lib/pricing";

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export const roleEnum = pgEnum("role", ["customer", "staff", "admin"]);
export const orderStatusEnum = pgEnum("order_status", [
  "received",
  "review",
  "proof_ready",
  "changes_requested",
  "approved",
  "production",
  "qc",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
]);
export const prodStageEnum = pgEnum("prod_stage", ["queued", "printing", "laminating", "cutting"]);
export const proofStatusEnum = pgEnum("proof_status", ["pending", "approved", "changes_requested", "superseded"]);
export const fileKindEnum = pgEnum("file_kind", ["artwork", "reference", "proof"]);
export const actorEnum = pgEnum("actor", ["customer", "staff", "system"]);

/** Order numbers continue after the prototype's sample orders (SSD-1039 … SSD-1060). */
export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1061 });

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

/** Everyone who can sign in: customers and shop staff. auth_user_id links to Supabase Auth once they first sign in. */
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: uuid("auth_user_id").unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  company: text("company"),
  role: roleEnum("role").notNull().default("customer"),
  defaultAddress: jsonb("default_address").$type<Address>(),
  createdAt: created(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number")
      .notNull()
      .unique()
      .default(sql`'SSD-' || nextval('order_number_seq')`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    // Contact snapshot at the time of ordering
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    company: text("company"),
    shipAddress: jsonb("ship_address").$type<Address>().notNull(),
    billAddress: jsonb("bill_address").$type<Address>().notNull(),
    shipMethod: text("ship_method").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    status: orderStatusEnum("status").notNull().default("received"),
    prodStage: prodStageEnum("prod_stage"),
    isRush: boolean("is_rush").notNull().default(false),
    approvedAt: ts("approved_at"),
    approvedProofId: uuid("approved_proof_id").references((): AnyPgColumn => proofs.id),
    dueAt: ts("due_at"),
    reorderOf: uuid("reorder_of").references((): AnyPgColumn => orders.id),
    stripeSessionId: text("stripe_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    cardBrand: text("card_brand"),
    cardLast4: text("card_last4"),
    createdAt: created(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("orders_customer_idx").on(t.customerId), index("orders_status_idx").on(t.status)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    productId: text("product_id").notNull(),
    shape: text("shape").notNull(),
    /** Preset size in inches, or null for a custom size. */
    sizeIn: real("size_in"),
    customW: real("custom_w"),
    customH: real("custom_h"),
    /** Finished size in inches (resolved from preset or custom). */
    widthIn: real("width_in").notNull(),
    heightIn: real("height_in").notNull(),
    qty: integer("qty").notNull(),
    material: text("material").notNull(),
    laminate: boolean("laminate").notNull().default(false),
    rush: boolean("rush").notNull().default(false),
    designHelp: boolean("design_help").notNull().default(false),
    designNotes: text("design_notes"),
    /** Customer paid for image enhancement: staff run the artwork through Topaz Gigapixel. */
    enhance: boolean("enhance").notNull().default(false),
    /** Customer's resize/move of their artwork on the preview. */
    artFit: jsonb("art_fit").$type<ArtFit>(),
    priceCents: integer("price_cents").notNull(),
    priceLines: jsonb("price_lines").$type<PriceLine[]>().notNull(),
    pricingVersion: text("pricing_version").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** Artwork, reference images and proofs. Bytes live in Supabase Storage; this is the metadata. */
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: fileKindEnum("kind").notNull(),
    bucket: text("bucket").notNull(),
    path: text("path").notNull(),
    originalName: text("original_name").notNull(),
    mime: text("mime"),
    ext: text("ext").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    sha256: text("sha256"),
    /** Placeholder art key for seeded demo data (see src/lib/art.ts). Null for real uploads. */
    sampleArt: text("sample_art"),
    /** pending: upload started; ready: bytes checked; rejected: not the file type it claimed. */
    status: text("status").notNull().default("ready"),
    /** SHA-256 of the secret the uploader's browser holds, so only they can attach the file to an order. */
    uploadTokenHash: text("upload_token_hash"),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by").references(() => customers.id),
    createdAt: created(),
  },
  (t) => [index("files_order_idx").on(t.orderId)],
);

export const proofs = pgTable(
  "proofs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Reserved for one-proof-per-item later; null = proof for the whole order. */
    orderItemId: uuid("order_item_id").references(() => orderItems.id),
    version: integer("version").notNull(),
    fileId: uuid("file_id").references(() => files.id),
    staffMessage: text("staff_message"),
    status: proofStatusEnum("status").notNull().default("pending"),
    customerNote: text("customer_note"),
    sentBy: uuid("sent_by").references(() => customers.id),
    sentAt: ts("sent_at").notNull().defaultNow(),
    respondedAt: ts("responded_at"),
  },
  (t) => [uniqueIndex("proofs_order_version_idx").on(t.orderId, t.version)],
);

/** Activity log. Every status change writes one; it also drives the customer's tracker timeline. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status"),
    text: text("text").notNull(),
    actor: actorEnum("actor").notNull(),
    actorId: uuid("actor_id").references(() => customers.id),
    /** Display name, e.g. "Customer", "Staff", "Print floor". */
    actorName: text("actor_name").notNull(),
    customerVisible: boolean("customer_visible").notNull().default(true),
    createdAt: created(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

/** Staff-only notes. Never sent to customer pages. */
export const internalNotes = pgTable("internal_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => customers.id),
  authorName: text("author_name").notNull(),
  text: text("text").notNull(),
  createdAt: created(),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  carrier: text("carrier").notNull(),
  trackingNumber: text("tracking_number").notNull(),
  shippedAt: ts("shipped_at").notNull(),
  eta: ts("eta"),
  deliveredAt: ts("delivered_at"),
  createdAt: created(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: ts("read_at"),
    emailedAt: ts("emailed_at"),
    emailMessageId: text("email_message_id"),
    createdAt: created(),
  },
  (t) => [index("notifications_customer_idx").on(t.customerId, t.createdAt)],
);

/**
 * A checkout in progress: the server-checked, server-priced cart, saved when the customer clicks Place order and
 * turned into an order once Stripe confirms payment. Stripe only gets this row's id.
 */
export const checkouts = pgTable("checkouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeSessionId: text("stripe_session_id").unique(),
  email: text("email").notNull(),
  /** CheckoutPayload (src/server/checkout.ts). */
  payload: jsonb("payload").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: text("status").notNull().default("open"),
  orderId: uuid("order_id").references(() => orders.id),
  createdAt: created(),
  completedAt: ts("completed_at"),
});

/** Stripe webhook events already processed (so a retried webhook never creates a second order). */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: ts("processed_at").notNull().defaultNow(),
});

export const quoteRequests = pgTable("quote_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  stickerType: text("sticker_type"),
  quantity: text("quantity"),
  details: text("details"),
  createdAt: created(),
});

export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Proof = typeof proofs.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
