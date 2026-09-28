import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { newConfig } from "@/lib/config";
import { calculatePrice } from "@/lib/pricing";
import { buildPayload, CheckoutError, createCheckout, fulfillCheckout, orderForSession, type CheckoutInput, type Payments } from "./checkout";
import * as s from "./db/schema";
import { resetDatabase, seedDatabase } from "./db/seed";
import type { Db } from "./db/types";
import type { Storage } from "./storage";
import { completeUpload, startUpload } from "./uploads";
import { createTestDb } from "./test/db";

let db: Db;

/** Fake Stripe: remembers sessions; `pay` marks one paid. */
function fakePayments() {
  const sessions = new Map<string, { checkoutId: string; paid: boolean; amount: number }>();
  let n = 0;
  const payments: Payments = {
    async createSession({ checkoutId, lines }) {
      const id = `cs_test_${++n}`;
      sessions.set(id, { checkoutId, paid: false, amount: lines.reduce((t, l) => t + l.amountCents, 0) });
      return { id, url: `https://checkout.stripe.test/${id}` };
    },
    async getSession(id) {
      const x = sessions.get(id);
      return x ? { id, paid: x.paid, checkoutId: x.checkoutId, amountTotal: x.amount, paymentIntentId: `pi_${id}`, cardBrand: "Visa", cardLast4: "4242" } : null;
    },
  };
  return { payments, sessions, pay: (id: string) => (sessions.get(id)!.paid = true) };
}

/** Fake storage holding one real PNG per upload. */
const PNG = (() => {
  const b = new Uint8Array(40);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, 300);
  new DataView(b.buffer).setUint32(20, 300);
  return b;
})();
const storage: Storage = {
  createUploadUrl: async () => ({ signedUrl: "https://storage.test/x" }),
  readHead: async () => PNG,
  remove: async () => {},
  downloadUrl: async () => "https://storage.test/dl",
};
async function uploadedPng(name = "logo.png") {
  const up = await startUpload(db, storage, { name, size: 40 });
  await completeUpload(db, storage, up);
  return { fileId: up.fileId, token: up.token };
}

const contact = { name: "Riley Park", email: "Riley@Example.com", phone: "(208) 555-0101" };
const ship = { line1: "100 W Main St", city: "Boise", state: "ID", zip: "83702" };

beforeAll(async () => {
  ({ db } = await createTestDb());
}, 60_000);
beforeEach(async () => {
  await resetDatabase(db);
  await seedDatabase(db);
});

describe("buildPayload", () => {
  it("reprices on the server and ignores any price the browser sends", async () => {
    const f = await uploadedPng();
    const input = { contact, ship, bill: null, shipMethod: "standard", items: [{ ...newConfig("die-cut"), priceCents: 1, files: [f] }] } as unknown as CheckoutInput;
    const p = await buildPayload(db, input);
    expect(p.items[0].priceCents).toBe(5321);
    expect(p.totals).toEqual({ subtotalCents: 5321, shippingCents: 695, taxCents: 319, totalCents: 6335 });
    expect(p.contact.email).toBe("riley@example.com");
    expect(p.bill).toEqual(p.ship);
  });

  it("repairs impossible options instead of trusting them", async () => {
    const f = await uploadedPng();
    const p = await buildPayload(db, {
      contact,
      ship,
      bill: null,
      shipMethod: "teleport",
      items: [{ productId: "circle", shape: "hexagon" as never, size: 99, qty: 3, material: "gold" as never, files: [f] }],
    });
    expect(p.shipMethod).toBe("standard");
    expect([p.items[0].cfg.shape, p.items[0].cfg.material, p.items[0].cfg.size, p.items[0].cfg.qty]).toEqual(["circle", "gloss", 3, 50]);
  });

  it("requires artwork or design help, real uploads, and contact details", async () => {
    const base = { contact, ship, bill: null, shipMethod: "standard" };
    await expect(buildPayload(db, { ...base, items: [newConfig("die-cut")] })).rejects.toThrow(/upload your artwork/);
    await expect(buildPayload(db, { ...base, items: [{ ...newConfig("die-cut"), designHelp: true }] })).rejects.toThrow(/tell us what you need/);
    expect((await buildPayload(db, { ...base, items: [{ ...newConfig("die-cut"), designHelp: true, designNotes: "A fox" }] })).items).toHaveLength(1);
    const f = await uploadedPng();
    await expect(buildPayload(db, { ...base, items: [{ ...newConfig("die-cut"), files: [{ fileId: f.fileId, token: "stolen" }] }] })).rejects.toThrow(/missing/);
    await expect(buildPayload(db, { ...base, contact: { ...contact, email: "nope" }, items: [] })).rejects.toThrow(CheckoutError);
    await expect(buildPayload(db, { ...base, ship: { ...ship, zip: "" }, items: [] })).rejects.toThrow(/shipping address/);
  });

  it("only charges image enhancement when there's a photo to enhance", async () => {
    const withPhoto = await buildPayload(db, { contact, ship, bill: null, shipMethod: "standard", items: [{ ...newConfig("square"), enhance: true, files: [await uploadedPng()] }] });
    expect(withPhoto.items[0].cfg.enhance).toBe(true);
    expect(withPhoto.items[0].priceCents).toBe(calculatePrice({ ...newConfig("square"), enhance: true }).totalCents);
    const noPhoto = await buildPayload(db, { contact, ship, bill: null, shipMethod: "standard", items: [{ ...newConfig("square"), enhance: true, designHelp: true, designNotes: "x" }] });
    expect(noPhoto.items[0].cfg.enhance).toBe(false);
  });
});

describe("checkout → order", () => {
  async function checkout(extra: Partial<CheckoutInput["items"][number]> = {}) {
    const fake = fakePayments();
    const f = await uploadedPng("brand-logo.png");
    const c = await createCheckout(db, fake.payments, { contact, ship, bill: null, shipMethod: "standard", items: [{ ...newConfig("die-cut"), qty: 250, files: [f], ...extra }] }, "https://shop.test");
    const [row] = await db.select().from(s.checkouts).where(eq(s.checkouts.id, c.checkoutId));
    return { fake, f, c, sessionId: row.stripeSessionId! };
  }

  it("creates nothing until the payment goes through", async () => {
    const { fake, sessionId, c } = await checkout();
    expect(c.url).toContain("checkout.stripe.test");
    expect(await fulfillCheckout(db, fake.payments, sessionId)).toBeNull();
    expect(await db.select().from(s.orders).where(eq(s.orders.stripeSessionId, sessionId))).toHaveLength(0);
  });

  it("creates the order once payment succeeds, with files, log, notification and a new customer", async () => {
    const { fake, sessionId, f } = await checkout({ designHelp: true, designNotes: "Make it pop", enhance: true, options: { laminate: true, rush: true } });
    fake.pay(sessionId);
    const order = (await fulfillCheckout(db, fake.payments, sessionId))!;
    expect(order.number).toBe("SSD-1061");
    expect([order.status, order.paymentStatus, order.cardBrand, order.cardLast4, order.isRush]).toEqual(["received", "paid", "Visa", "4242", true]);
    const [item] = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));
    expect([item.qty, item.enhance, item.laminate, item.designNotes]).toEqual([250, true, true, "Make it pop"]);
    const [file] = await db.select().from(s.files).where(eq(s.files.id, f.fileId));
    expect([file.orderId, file.orderItemId]).toEqual([order.id, item.id]);
    const [cust] = await db.select().from(s.customers).where(eq(s.customers.id, order.customerId));
    expect([cust.email, cust.name]).toEqual(["riley@example.com", "Riley Park"]);
    const ev = await db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, order.id));
    expect(ev.map((e) => e.text)).toEqual(["Order placed online"]);
    const notes = await db.select().from(s.internalNotes).where(eq(s.internalNotes.orderId, order.id));
    expect(notes.map((n) => n.text).join(" ")).toMatch(/Design help.*Topaz/);
    expect((await db.select().from(s.notifications).where(eq(s.notifications.orderId, order.id)))[0].title).toBe("Order received");
  });

  it("never creates the order twice (webhook and success page racing)", async () => {
    const { fake, sessionId } = await checkout();
    fake.pay(sessionId);
    const [a, b] = await Promise.all([fulfillCheckout(db, fake.payments, sessionId), orderForSession(db, fake.payments, sessionId)]);
    expect(a!.id).toBe(b!.id);
    expect(await db.select().from(s.orders).where(eq(s.orders.stripeSessionId, sessionId))).toHaveLength(1);
    expect((await orderForSession(db, fake.payments, sessionId))!.id).toBe(a!.id);
  });

  it("puts orders from an existing customer's email on their account", async () => {
    const { fake, sessionId } = await checkout();
    await db.update(s.checkouts).set({ email: "jordan@example.com" });
    const [co] = await db.select().from(s.checkouts).where(eq(s.checkouts.stripeSessionId, sessionId));
    await db
      .update(s.checkouts)
      .set({ payload: { ...(co.payload as object), contact: { ...contact, email: "jordan@example.com" } } })
      .where(eq(s.checkouts.id, co.id));
    fake.pay(sessionId);
    const order = (await fulfillCheckout(db, fake.payments, sessionId))!;
    const [jordan] = await db.select().from(s.customers).where(eq(s.customers.email, "jordan@example.com"));
    expect(order.customerId).toBe(jordan.id);
  });

  it("refuses a payment that doesn't match the checkout total", async () => {
    const { fake, sessionId } = await checkout();
    fake.pay(sessionId);
    fake.sessions.get(sessionId)!.amount = 1;
    await expect(fulfillCheckout(db, fake.payments, sessionId)).rejects.toThrow(/doesn't match/);
    expect(await db.select().from(s.orders).where(eq(s.orders.stripeSessionId, sessionId))).toHaveLength(0);
  });
});
