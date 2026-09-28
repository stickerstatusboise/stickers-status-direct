/**
 * Checkout: turn the browser's cart into a paid order.
 *
 * 1. createCheckout: validate the cart and contact details, reprice everything on the server (the browser's
 *    numbers are never used), check the uploaded files, save it as a `checkouts` row and open a Stripe Checkout page.
 * 2. fulfillCheckout: once Stripe says the session is paid (webhook, or the customer landing on the success page,
 *    whichever comes first), create the order exactly once.
 */
import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { canAdjustArt, clampFit, RASTER_TYPES, type ArtFit } from "@/lib/artwork";
import { CATALOG, findProduct, getMaterial, getProduct, getShape, getShipping, type MaterialId, type ShapeId } from "@/lib/catalog";
import { dims, inch, normalizeQty, type StickerConfig } from "@/lib/config";
import { fmtQty } from "@/lib/format";
import { calculatePrice, cartTotals, PRICING_VERSION, type PriceLine, type Totals } from "@/lib/pricing";
import { CUSTOMER_NOTICE } from "@/lib/status";
import { UPLOAD_LIMITS } from "@/lib/uploads";
import { checkouts, customers, files, internalNotes, notifications, orderEvents, orderItems, orders, type Address, type Order } from "./db/schema";
import type { Db } from "./db/types";
import { attachUploads } from "./uploads";

export class CheckoutError extends Error {}

const MAX_ITEMS = 20;
const MAX_QTY = 100_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What the browser sends. Everything here is untrusted. */
export interface CheckoutInput {
  contact: { name: string; email: string; phone: string };
  ship: Address;
  /** null = same as shipping */
  bill: Address | null;
  shipMethod: string;
  items: (Partial<StickerConfig> & { artFit?: ArtFit; files?: { fileId?: string; token?: string }[] })[];
}

export interface PricedItem {
  cfg: StickerConfig;
  widthIn: number;
  heightIn: number;
  artFit: ArtFit | null;
  priceCents: number;
  priceLines: PriceLine[];
  files: { fileId: string; token: string }[];
}

/** Saved on the checkouts row; everything needed to create the order later. */
export interface CheckoutPayload {
  contact: { name: string; email: string; phone: string };
  ship: Address;
  bill: Address;
  shipMethod: string;
  items: PricedItem[];
  totals: Totals;
  pricingVersion: string;
}

/** What checkout needs from Stripe. The real one is src/server/stripe.ts; tests use a fake. */
export interface Payments {
  createSession(args: {
    checkoutId: string;
    email: string;
    lines: { name: string; description?: string; amountCents: number }[];
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string; url: string }>;
  /** The session if it exists; `paid` is true once the payment went through. */
  getSession(id: string): Promise<{
    id: string;
    paid: boolean;
    checkoutId: string | null;
    amountTotal: number | null;
    paymentIntentId: string | null;
    cardBrand: string | null;
    cardLast4: string | null;
  } | null>;
}

const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

function cleanAddress(a: Partial<Address> | null | undefined, label: string): Address {
  const r = { line1: str(a?.line1), line2: str(a?.line2), city: str(a?.city, 100), state: str(a?.state, 50), zip: str(a?.zip, 20) };
  if (!r.line1 || !r.city || !r.state || !r.zip) throw new CheckoutError(`Please fill in the ${label} address.`);
  return r;
}

const bool = (v: unknown) => v === true;

function cleanItem(raw: CheckoutInput["items"][number], n: number): Omit<PricedItem, "files"> & { fileRefs: { fileId: string; token: string }[] } {
  const product = findProduct(String(raw.productId ?? ""));
  if (!product) throw new CheckoutError(`Sticker ${n} isn't available any more. Please remove it from your cart.`);
  const shape = CATALOG.shapes.some((s) => s.id === raw.shape) ? (raw.shape as ShapeId) : product.shape;
  const material = CATALOG.materials.some((m) => m.id === raw.material) ? (raw.material as MaterialId) : product.material;
  const size = raw.size === "custom" ? "custom" : CATALOG.sizes.includes(Number(raw.size)) ? Number(raw.size) : 3;
  const qty = normalizeQty(raw.qty);
  if (qty > MAX_QTY) throw new CheckoutError(`For more than ${fmtQty(MAX_QTY)} stickers, please request a quote.`);
  const fileRefs = (Array.isArray(raw.files) ? raw.files : [])
    .filter((f): f is { fileId: string; token: string } => typeof f?.fileId === "string" && typeof f?.token === "string")
    .slice(0, UPLOAD_LIMITS.maxFilesPerItem);
  const cfg: StickerConfig = {
    productId: product.id,
    shape,
    size,
    cw: Number(raw.cw) || 3,
    ch: Number(raw.ch) || 2,
    qty,
    material,
    options: { laminate: bool(raw.options?.laminate), rush: bool(raw.options?.rush) },
    designHelp: bool(raw.designHelp),
    designNotes: str(raw.designNotes, 2000),
    enhance: bool(raw.enhance),
  };
  const d = dims(cfg);
  return {
    cfg,
    widthIn: d.w,
    heightIn: d.h,
    artFit: raw.artFit && canAdjustArt(shape) ? clampFit(raw.artFit) : null,
    priceCents: 0,
    priceLines: [],
    fileRefs,
  };
}

/** Validate and price everything on the server. Throws CheckoutError with a message the customer can act on. */
export async function buildPayload(db: Db, input: CheckoutInput): Promise<CheckoutPayload> {
  const contact = { name: str(input?.contact?.name, 100), email: str(input?.contact?.email).toLowerCase(), phone: str(input?.contact?.phone, 40) };
  if (!contact.name) throw new CheckoutError("Please enter your name.");
  if (!EMAIL_RE.test(contact.email)) throw new CheckoutError("Please enter a valid email address.");
  if (!contact.phone) throw new CheckoutError("Please enter a phone number, in case we have a question about your artwork.");
  const ship = cleanAddress(input.ship, "shipping");
  const bill = input.bill ? cleanAddress(input.bill, "billing") : ship;
  const shipMethod = getShipping(input.shipMethod).id;
  if (!Array.isArray(input.items) || !input.items.length) throw new CheckoutError("Your cart is empty.");
  if (input.items.length > MAX_ITEMS) throw new CheckoutError(`Please split orders over ${MAX_ITEMS} designs, or request a quote.`);

  const items: PricedItem[] = [];
  for (const [i, raw] of input.items.entries()) {
    const it = cleanItem(raw, i + 1);
    const name = getProduct(it.cfg.productId).name;

    // Only confirmed uploads that belong to this browser (secret matches) and aren't on another order
    const refs: { fileId: string; token: string }[] = [];
    for (const r of it.fileRefs) {
      if (!/^[0-9a-f-]{36}$/i.test(r.fileId)) continue;
      const [f] = await db
        .select({ status: files.status, hash: files.uploadTokenHash })
        .from(files)
        .where(and(eq(files.id, r.fileId), isNull(files.orderId)));
      const secretOk = !!f?.hash && f.hash === createHash("sha256").update(r.token).digest("hex");
      if (!f || !secretOk || f.status !== "ready") throw new CheckoutError(`One of the files for ${name} is missing. Please edit the sticker and upload it again.`);
      refs.push(r);
    }
    if (!refs.length && !it.cfg.designHelp)
      throw new CheckoutError(`${name}: please upload your artwork, or choose design help.`);
    if (it.cfg.designHelp && !refs.length && !it.cfg.designNotes)
      throw new CheckoutError(`${name}: tell us what you need designed, or upload a reference.`);

    // Enhancement needs a photo-type file to enhance; otherwise it's not charged
    if (it.cfg.enhance) {
      const exts = await Promise.all(refs.map(async (r) => (await db.select({ ext: files.ext }).from(files).where(eq(files.id, r.fileId)))[0]?.ext));
      if (!exts.some((e) => e && RASTER_TYPES.includes(e))) it.cfg.enhance = false;
    }

    const price = calculatePrice(it.cfg);
    items.push({ cfg: it.cfg, widthIn: it.widthIn, heightIn: it.heightIn, artFit: it.artFit, priceCents: price.totalCents, priceLines: price.lines, files: refs });
  }

  const totals = cartTotals(
    items.reduce((s, i) => s + i.priceCents, 0),
    getShipping(shipMethod),
  );
  return { contact, ship, bill, shipMethod, items, totals, pricingVersion: PRICING_VERSION };
}

const itemTitle = (it: PricedItem) => `${getProduct(it.cfg.productId).name} · ${fmtQty(it.cfg.qty)} pcs`;
const itemDescription = (it: PricedItem) =>
  [
    `${getShape(it.cfg.shape).name}, ${inch(it.widthIn)} × ${inch(it.heightIn)}, ${getMaterial(it.cfg.material).name}`,
    ...CATALOG.options.filter((o) => it.cfg.options[o.id]).map((o) => o.name),
    it.cfg.designHelp ? "Design help" : "",
    it.cfg.enhance ? "Image enhancement" : "",
  ]
    .filter(Boolean)
    .join(" · ");

/** Save the checked cart and open a Stripe Checkout page. Returns the page to send the customer to. */
export async function createCheckout(db: Db, payments: Payments, input: CheckoutInput, origin: string) {
  const payload = await buildPayload(db, input);
  const [row] = await db
    .insert(checkouts)
    .values({ email: payload.contact.email, payload, totalCents: payload.totals.totalCents })
    .returning({ id: checkouts.id });

  const t = payload.totals;
  const lines = [
    ...payload.items.map((it) => ({ name: itemTitle(it), description: itemDescription(it), amountCents: it.priceCents })),
    ...(t.shippingCents ? [{ name: `Shipping (${getShipping(payload.shipMethod).name})`, amountCents: t.shippingCents }] : []),
    ...(t.taxCents ? [{ name: "Sales tax", amountCents: t.taxCents }] : []),
  ];
  const session = await payments.createSession({
    checkoutId: row.id,
    email: payload.contact.email,
    lines,
    successUrl: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/checkout?canceled=1`,
  });
  await db.update(checkouts).set({ stripeSessionId: session.id }).where(eq(checkouts.id, row.id));
  return { checkoutId: row.id, url: session.url };
}

/**
 * Create the order for a paid Stripe session. Safe to call any number of times, from the webhook and the success
 * page at once: the checkout row is locked and only the first call creates the order.
 * Returns the order, or null if the session isn't paid (yet).
 */
export async function fulfillCheckout(db: Db, payments: Payments, sessionId: string): Promise<Order | null> {
  const session = await payments.getSession(sessionId);
  if (!session?.paid || !session.checkoutId) return null;

  return db.transaction(async (tx) => {
    const [co] = await tx.select().from(checkouts).where(eq(checkouts.id, session.checkoutId!)).for("update");
    if (!co || co.stripeSessionId !== session.id) throw new CheckoutError("Checkout not found for this payment");
    if (co.orderId) {
      const [existing] = await tx.select().from(orders).where(eq(orders.id, co.orderId));
      return existing;
    }
    const p = co.payload as CheckoutPayload;
    if (session.amountTotal != null && session.amountTotal !== co.totalCents) {
      await tx.update(checkouts).set({ status: "amount_mismatch" }).where(eq(checkouts.id, co.id));
      throw new CheckoutError(`Paid amount ${session.amountTotal} doesn't match checkout ${co.totalCents}`);
    }

    // Customer: existing account by email, or a new one
    let [customer] = await tx.select().from(customers).where(eq(customers.email, p.contact.email));
    if (!customer) {
      [customer] = await tx
        .insert(customers)
        .values({ email: p.contact.email, name: p.contact.name, phone: p.contact.phone, defaultAddress: p.ship })
        .returning();
    } else if (!customer.defaultAddress || !customer.phone) {
      await tx
        .update(customers)
        .set({ defaultAddress: customer.defaultAddress ?? p.ship, phone: customer.phone ?? p.contact.phone })
        .where(eq(customers.id, customer.id));
    }

    const [order] = await tx
      .insert(orders)
      .values({
        customerId: customer.id,
        email: p.contact.email,
        name: p.contact.name,
        phone: p.contact.phone,
        company: customer.company,
        shipAddress: p.ship,
        billAddress: p.bill,
        shipMethod: p.shipMethod,
        subtotalCents: p.totals.subtotalCents,
        shippingCents: p.totals.shippingCents,
        taxCents: p.totals.taxCents,
        totalCents: p.totals.totalCents,
        isRush: p.items.some((i) => i.cfg.options.rush),
        stripeSessionId: session.id,
        stripePaymentIntentId: session.paymentIntentId,
        paymentStatus: "paid",
        cardBrand: session.cardBrand,
        cardLast4: session.cardLast4,
      })
      .returning();

    const notes: string[] = [];
    for (const [position, it] of p.items.entries()) {
      const [row] = await tx
        .insert(orderItems)
        .values({
          orderId: order.id,
          position,
          productId: it.cfg.productId,
          shape: it.cfg.shape,
          sizeIn: it.cfg.size === "custom" ? null : it.cfg.size,
          customW: it.cfg.size === "custom" ? it.cfg.cw : null,
          customH: it.cfg.size === "custom" ? it.cfg.ch : null,
          widthIn: it.widthIn,
          heightIn: it.heightIn,
          qty: it.cfg.qty,
          material: it.cfg.material,
          laminate: it.cfg.options.laminate,
          rush: it.cfg.options.rush,
          designHelp: it.cfg.designHelp,
          designNotes: it.cfg.designNotes || null,
          enhance: it.cfg.enhance,
          artFit: it.artFit,
          priceCents: it.priceCents,
          priceLines: it.priceLines,
          pricingVersion: p.pricingVersion,
        })
        .returning({ id: orderItems.id });
      await attachUploads(tx as unknown as Db, it.files, order.id, row.id);
      const name = `${getProduct(it.cfg.productId).name} (item ${position + 1})`;
      if (it.cfg.designHelp) notes.push(`Design help requested for ${name}. Assign to a designer.`);
      if (it.cfg.enhance) notes.push(`Image enhancement paid for ${name}: run the artwork through Topaz Gigapixel before proofing.`);
      if (it.artFit) notes.push(`Customer resized/moved the artwork on ${name} (${Math.round(it.artFit.scale * 100)}% size). Use their layout as a guide for the proof.`);
    }

    await tx.insert(orderEvents).values({ orderId: order.id, status: "received", text: "Order placed online", actor: "customer", actorId: customer.id, actorName: "Customer" });
    const notice = CUSTOMER_NOTICE.received!(order.number);
    await tx.insert(notifications).values({ customerId: customer.id, orderId: order.id, kind: "received", title: notice.title, body: notice.body });
    if (notes.length) await tx.insert(internalNotes).values(notes.map((text) => ({ orderId: order.id, authorName: "System", text })));

    await tx.update(checkouts).set({ status: "completed", orderId: order.id, completedAt: new Date() }).where(eq(checkouts.id, co.id));
    return order;
  });
}

/** Look up the order made from a Stripe session (success page), creating it now if the webhook hasn't yet. */
export async function orderForSession(db: Db, payments: Payments, sessionId: string) {
  const [co] = await db.select().from(checkouts).where(eq(checkouts.stripeSessionId, sessionId));
  if (!co) return null;
  if (co.orderId) return (await db.select().from(orders).where(eq(orders.id, co.orderId)))[0] ?? null;
  return fulfillCheckout(db, payments, sessionId);
}
