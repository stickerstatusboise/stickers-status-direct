import { and, asc, eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { zonedTime } from "@/lib/dates";
import { approveProof, OrderRuleError, requestChanges, sendProof, transitionOrder, type Actor } from "./orders";
import * as s from "./db/schema";
import { resetDatabase, seedDatabase } from "./db/seed";
import type { Db } from "./db/types";
import { createTestDb } from "./test/db";

const customer: Actor = { type: "customer", name: "Customer" };
const staff: Actor = { type: "staff", name: "Staff" };
let db: Db;

async function order(number: string) {
  const [o] = await db.select().from(s.orders).where(eq(s.orders.number, number));
  return o;
}
const proofsOf = (orderId: string) => db.select().from(s.proofs).where(eq(s.proofs.orderId, orderId)).orderBy(asc(s.proofs.version));
const eventsOf = (orderId: string) => db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, orderId)).orderBy(asc(s.orderEvents.createdAt));
/** Expect the database to refuse with the proof-lock message (Drizzle wraps the Postgres error as `cause`). */
async function expectLocked(p: Promise<unknown>) {
  const err = await p.then(
    () => null,
    (e: { message: string; cause?: { message?: string } }) => e,
  );
  expect(err, "expected the database to refuse").not.toBeNull();
  expect(err?.cause?.message ?? err?.message).toMatch(/locked/);
}
const noticesOf = (orderId: string) => db.select().from(s.notifications).where(eq(s.notifications.orderId, orderId));

beforeAll(async () => {
  ({ db } = await createTestDb());
}, 60_000);

beforeEach(async () => {
  await resetDatabase(db);
  await seedDatabase(db, { adminEmail: "Owner@Example.com" });
});

describe("migrations + seed", () => {
  it("loads the prototype's sample data", async () => {
    const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(s.customers);
    expect(c).toBe(13); // 12 customers + admin
    const all = await db.select({ number: s.orders.number, status: s.orders.status }).from(s.orders);
    expect(all).toHaveLength(15);
    const byStatus = Object.fromEntries(all.map((o) => [o.number, o.status]));
    expect(byStatus["SSD-1057"]).toBe("proof_ready");
    expect(byStatus["SSD-1053"]).toBe("changes_requested");
    expect(byStatus["SSD-1041"]).toBe("delivered");
    const [admin] = await db.select().from(s.customers).where(eq(s.customers.email, "owner@example.com"));
    expect(admin.role).toBe("admin");
  });

  it("keeps proof history and links approved proofs", async () => {
    const o57 = await order("SSD-1057");
    expect((await proofsOf(o57.id)).map((p) => [p.version, p.status])).toEqual([
      [1, "changes_requested"],
      [2, "pending"],
    ]);
    const o52 = await order("SSD-1052");
    const [p] = await proofsOf(o52.id);
    expect(p.status).toBe("approved");
    expect(o52.approvedProofId).toBe(p.id);
    expect(o52.prodStage).toBe("printing");
  });

  it("numbers new orders after the sample ones", async () => {
    const jordan = (await order("SSD-1041")).customerId;
    const addr = { line1: "1 Main", city: "Boise", state: "ID", zip: "83702" };
    const [o] = await db
      .insert(s.orders)
      .values({ customerId: jordan, email: "jordan@example.com", name: "Jordan", shipAddress: addr, billAddress: addr, shipMethod: "standard", subtotalCents: 1, shippingCents: 0, taxCents: 0, totalCents: 1 })
      .returning();
    expect(o.number).toBe("SSD-1061");
  });

  it("turns on row-level security for every table", async () => {
    const res = (await db.execute(sql`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`)) as unknown as { rows: unknown[] };
    expect(res.rows).toEqual([]);
  });

  it("rejects mixed-case emails", async () => {
    await expect(db.insert(s.customers).values({ email: "Bad@Example.com", name: "x" })).rejects.toThrow();
  });
});

describe("approveProof", () => {
  it("locks the proof, sets the due date and moves to production", async () => {
    const o = await order("SSD-1057");
    const now = zonedTime(2026, 10, 5, 10); // Monday 10am Boise
    const updated = await approveProof(db, o.id, customer, now);

    expect(updated.status).toBe("production");
    expect(updated.prodStage).toBe("queued");
    expect(updated.approvedAt?.toISOString()).toBe(now.toISOString());
    expect(updated.dueAt?.toISOString()).toBe(zonedTime(2026, 10, 8, 17).toISOString()); // Thu 5pm
    const ps = await proofsOf(o.id);
    expect(ps.map((p) => p.status)).toEqual(["changes_requested", "approved"]);
    expect(updated.approvedProofId).toBe(ps[1].id);

    const ev = (await eventsOf(o.id)).slice(-2);
    expect(ev.map((e) => [e.status, e.actor])).toEqual([
      ["approved", "customer"],
      ["production", "system"],
    ]);
    expect((await noticesOf(o.id)).map((n) => n.title)).toContain("In production");
  });

  it("gives rush orders one business day", async () => {
    const o = await order("SSD-1056");
    await db.update(s.orderItems).set({ rush: true }).where(eq(s.orderItems.orderId, o.id));
    const updated = await approveProof(db, o.id, customer, zonedTime(2026, 10, 2, 15)); // Friday
    expect(updated.dueAt?.toISOString()).toBe(zonedTime(2026, 10, 5, 17).toISOString()); // Monday 5pm
    expect(updated.isRush).toBe(true);
  });

  it("makes the approved proof and its file impossible to change", async () => {
    const o = await order("SSD-1057");
    await approveProof(db, o.id, customer);
    const [, approved] = await proofsOf(o.id);
    await expectLocked(db.update(s.proofs).set({ staffMessage: "edited" }).where(eq(s.proofs.id, approved.id)));
    await expectLocked(db.delete(s.proofs).where(eq(s.proofs.id, approved.id)));
    await expectLocked(db.update(s.files).set({ path: "other.pdf" }).where(eq(s.files.id, approved.fileId!)));
    await expectLocked(db.insert(s.proofs).values({ orderId: o.id, version: 3 }));
    await expect(sendProof(db, o.id, {}, staff)).rejects.toThrow(OrderRuleError);
  });

  it("only approves a proof that's waiting", async () => {
    await expect(approveProof(db, (await order("SSD-1053")).id, customer)).rejects.toThrow(OrderRuleError);
    await expect(approveProof(db, (await order("SSD-1059")).id, customer)).rejects.toThrow(OrderRuleError);
  });
});

describe("requestChanges and sendProof", () => {
  it("records the customer's note and goes back to the team", async () => {
    const o = await order("SSD-1056");
    await expect(requestChanges(db, o.id, "   ", customer)).rejects.toThrow(/what to change/);
    const updated = await requestChanges(db, o.id, "Make the sun bigger", customer);
    expect(updated.status).toBe("changes_requested");
    const [p] = await proofsOf(o.id);
    expect([p.status, p.customerNote]).toEqual(["changes_requested", "Make the sun bigger"]);
    expect(p.respondedAt).not.toBeNull();
  });

  it("sends the next proof version and notifies the customer", async () => {
    const o = await order("SSD-1053");
    const { order: updated, proof } = await sendProof(db, o.id, { staffMessage: "Added EST. 1998" }, staff);
    expect(proof.version).toBe(2);
    expect(updated.status).toBe("proof_ready");
    expect((await noticesOf(o.id)).map((n) => n.title)).toEqual(["Your proof is ready!"]);
  });

  it("starts artwork review automatically on a new order", async () => {
    const o = await order("SSD-1059");
    await sendProof(db, o.id, {}, staff);
    const ev = await eventsOf(o.id);
    expect(ev.map((e) => e.status)).toEqual(["received", "review", "proof_ready"]);
    expect(ev.at(-1)?.text).toBe("Proof v1 sent to customer");
  });
});

describe("transitionOrder", () => {
  it("moves through production and logs every change", async () => {
    const o = await order("SSD-1052");
    const qc = await transitionOrder(db, o.id, "qc", staff);
    expect([qc.status, qc.prodStage]).toEqual(["qc", null]);
    const ev = await eventsOf(o.id);
    expect(ev.at(-1)).toMatchObject({ status: "qc", text: "Quality check started", actorName: "Staff" });
    expect((await noticesOf(o.id)).some((n) => n.title === "Quality check")).toBe(true);
  });

  it("doesn't notify for behind-the-scenes steps", async () => {
    const o = await order("SSD-1059");
    await transitionOrder(db, o.id, "review", staff);
    expect(await noticesOf(o.id)).toEqual([]);
  });

  it("refuses skipped or backwards steps", async () => {
    const o = await order("SSD-1059");
    await expect(transitionOrder(db, o.id, "production", staff)).rejects.toThrow(/Can't move SSD-1059/);
    await expect(transitionOrder(db, (await order("SSD-1044")).id, "production", staff)).rejects.toThrow(OrderRuleError);
  });

  it("requires the proper action for proof and shipping steps", async () => {
    const o = await order("SSD-1047");
    await expect(transitionOrder(db, o.id, "shipped", staff)).rejects.toThrow(/action/);
    const unchanged = await db.select().from(s.orders).where(and(eq(s.orders.id, o.id), eq(s.orders.status, "ready_to_ship")));
    expect(unchanged).toHaveLength(1);
  });
});
