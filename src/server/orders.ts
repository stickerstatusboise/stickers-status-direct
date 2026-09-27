/**
 * The only way order status changes. Each action runs in one database transaction that:
 * updates the order, writes an activity-log entry, and notifies the customer when the change is customer-facing.
 *
 * Who is allowed to call each action (the order's customer vs. staff) is checked by the caller (pages and API routes, step 3+).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { dueDateAfterApproval } from "@/lib/dates";
import { ACTION_ONLY, canTransition, CUSTOMER_NOTICE, LOG_TEXT, STATUS, type OrderStatus } from "@/lib/status";
import { notifications, orderEvents, orderItems, orders, proofs, type Order } from "./db/schema";
import type { Db } from "./db/types";

export interface Actor {
  type: "customer" | "staff" | "system";
  /** customers.id of the person, when there is one. */
  id?: string;
  /** Shown in the activity log, e.g. "Customer", "Kris (Design)", "Print floor". */
  name: string;
}

export const SYSTEM: Actor = { type: "system", name: "System" };

/** A request that breaks an order rule (wrong status, missing note, …). Safe to show to staff. */
export class OrderRuleError extends Error {}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function lockOrder(tx: Tx, orderId: string): Promise<Order> {
  const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  if (!o) throw new OrderRuleError("Order not found");
  return o;
}

async function logAndNotify(tx: Tx, o: Order, status: OrderStatus | null, text: string, actor: Actor, notify = true) {
  await tx.insert(orderEvents).values({
    orderId: o.id,
    status,
    text,
    actor: actor.type,
    actorId: actor.id,
    actorName: actor.name,
  });
  const notice = status && notify ? CUSTOMER_NOTICE[status] : undefined;
  if (notice) {
    const { title, body } = notice(o.number);
    await tx.insert(notifications).values({ customerId: o.customerId, orderId: o.id, kind: status!, title, body });
  }
}

async function setStatus(tx: Tx, o: Order, to: OrderStatus, patch: Partial<typeof orders.$inferInsert> = {}) {
  if (!canTransition(o.status, to)) {
    throw new OrderRuleError(`Can't move ${o.number} from ${STATUS[o.status].admin} to ${STATUS[to].admin}`);
  }
  const [updated] = await tx
    .update(orders)
    .set({ status: to, ...patch })
    .where(eq(orders.id, o.id))
    .returning();
  return updated;
}

/**
 * Plain status change (e.g. review, production, qc, ready_to_ship, delivered, cancelled).
 * Proof and shipping steps have their own actions below.
 */
export async function transitionOrder(db: Db, orderId: string, to: OrderStatus, actor: Actor, text?: string) {
  if (ACTION_ONLY.includes(to)) throw new OrderRuleError(`Use the ${STATUS[to].admin} action instead of a plain status change`);
  return db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    const patch: Partial<typeof orders.$inferInsert> = {};
    if (to === "production" && !o.prodStage) patch.prodStage = "queued";
    if (to !== "production") patch.prodStage = null;
    const updated = await setStatus(tx, o, to, patch);
    await logAndNotify(tx, updated, to, text ?? LOG_TEXT[to], actor);
    return updated;
  });
}

async function currentProof(tx: Tx, orderId: string) {
  const [p] = await tx.select().from(proofs).where(eq(proofs.orderId, orderId)).orderBy(desc(proofs.version)).limit(1);
  return p;
}

/** Staff send proof vN. Allowed for new orders, orders in review, and after the customer asked for changes. */
export async function sendProof(db: Db, orderId: string, input: { fileId?: string; staffMessage?: string }, actor: Actor) {
  return db.transaction(async (tx) => {
    let o = await lockOrder(tx, orderId);
    if (!["received", "review", "changes_requested"].includes(o.status)) {
      throw new OrderRuleError(`Can't send a proof while ${o.number} is ${STATUS[o.status].admin}`);
    }
    if (o.status === "received") {
      o = await setStatus(tx, o, "review");
      await logAndNotify(tx, o, "review", LOG_TEXT.review, actor);
    }
    const prev = await currentProof(tx, orderId);
    const version = (prev?.version ?? 0) + 1;
    const [proof] = await tx
      .insert(proofs)
      .values({
        orderId,
        version,
        fileId: input.fileId,
        staffMessage: input.staffMessage?.trim() || "Here is your proof. Check spelling, colors and size.",
        sentBy: actor.id,
      })
      .returning();
    o = await setStatus(tx, o, "proof_ready");
    await logAndNotify(tx, o, "proof_ready", `Proof v${version} sent to customer`, actor);
    return { order: o, proof };
  });
}

/** Customer asks for changes on the current proof, with a note for the team. */
export async function requestChanges(db: Db, orderId: string, note: string, actor: Actor) {
  const msg = note.trim();
  if (!msg) throw new OrderRuleError("Tell us what to change");
  return db.transaction(async (tx) => {
    let o = await lockOrder(tx, orderId);
    const p = await currentProof(tx, orderId);
    if (o.status !== "proof_ready" || !p || p.status !== "pending") throw new OrderRuleError("There's no proof waiting for a response");
    await tx.update(proofs).set({ status: "changes_requested", customerNote: msg, respondedAt: new Date() }).where(eq(proofs.id, p.id));
    o = await setStatus(tx, o, "changes_requested");
    await logAndNotify(tx, o, "changes_requested", `Customer requested changes on v${p.version}`, actor);
    return o;
  });
}

/**
 * Customer approves the current proof. Records the time, locks the proof as the production artwork
 * (the database refuses any later edit), sets the due date (3 business days, 1 for rush) and moves the order
 * into production automatically.
 */
export async function approveProof(db: Db, orderId: string, actor: Actor, now = new Date()) {
  return db.transaction(async (tx) => {
    let o = await lockOrder(tx, orderId);
    const p = await currentProof(tx, orderId);
    if (o.status !== "proof_ready" || !p || p.status !== "pending") throw new OrderRuleError("There's no proof waiting for approval");

    const [{ rush }] = await tx
      .select({ rush: sql<boolean>`coalesce(bool_or(${orderItems.rush}), false)` })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    const isRush = o.isRush || !!rush;

    await tx
      .update(proofs)
      .set({ status: "superseded" })
      .where(and(eq(proofs.orderId, orderId), eq(proofs.status, "pending"), sql`${proofs.id} <> ${p.id}`));
    await tx.update(proofs).set({ status: "approved", respondedAt: now }).where(eq(proofs.id, p.id));

    o = await setStatus(tx, o, "approved", { approvedAt: now, approvedProofId: p.id, dueAt: dueDateAfterApproval(now, isRush), isRush });
    await logAndNotify(tx, o, "approved", `Customer approved proof v${p.version} (locked as production artwork)`, actor);

    o = await setStatus(tx, o, "production", { prodStage: "queued" });
    await logAndNotify(tx, o, "production", "Moved to production queue automatically", SYSTEM);
    return o;
  });
}
