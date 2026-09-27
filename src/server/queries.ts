/**
 * Read-only queries for customer pages. Access checks (whose order is this?) are done by the caller with canViewOrder.
 */
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { ArtKey } from "@/lib/catalog";
import { STAGE_OF } from "@/lib/status";
import { customers, files, notifications, orderEvents, orderItems, orders, proofs, shipments, type Customer, type Order } from "./db/schema";
import type { Db } from "./db/types";
import { isStaff } from "./auth/customers";

export type OrderItemRow = typeof orderItems.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type ProofRow = typeof proofs.$inferSelect & { file: FileRow | null };
export type ShipmentRow = typeof shipments.$inferSelect;
export type EventRow = typeof orderEvents.$inferSelect;

export interface OrderSummary {
  order: Order;
  items: OrderItemRow[];
  proofs: ProofRow[];
  shipment: ShipmentRow | null;
  /** Placeholder art for the thumbnail (approved proof, else the item's artwork), until real image previews in step 4. */
  art: ArtKey | null;
}

export interface OrderDetail extends OrderSummary {
  files: FileRow[];
  events: EventRow[];
}

export const canViewOrder = (viewer: Customer | null, order: Pick<Order, "customerId">) =>
  !!viewer && (viewer.id === order.customerId || isStaff(viewer));

function artFor(orderId: string, ps: ProofRow[], fs: FileRow[]): ArtKey | null {
  const approved = ps.find((p) => p.orderId === orderId && p.status === "approved");
  const art = approved?.file?.sampleArt ?? fs.find((f) => f.orderId === orderId && f.kind !== "proof" && f.sampleArt)?.sampleArt;
  return (art as ArtKey | undefined) ?? null;
}

async function loadChildren(db: Db, orderIds: string[]) {
  if (!orderIds.length) return { items: [], proofRows: [], fileRows: [], shipmentRows: [] };
  const [items, proofRows, fileRows, shipmentRows] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)).orderBy(asc(orderItems.position)),
    db.select().from(proofs).where(inArray(proofs.orderId, orderIds)).orderBy(asc(proofs.version)),
    db.select().from(files).where(inArray(files.orderId, orderIds)).orderBy(asc(files.createdAt)),
    db.select().from(shipments).where(inArray(shipments.orderId, orderIds)).orderBy(desc(shipments.shippedAt)),
  ]);
  const withFiles: ProofRow[] = proofRows.map((p) => ({ ...p, file: fileRows.find((f) => f.id === p.fileId) ?? null }));
  return { items, proofRows: withFiles, fileRows, shipmentRows };
}

/** A customer's orders, newest first. */
export async function listOrdersForCustomer(db: Db, customerId: string): Promise<OrderSummary[]> {
  const rows = await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
  const { items, proofRows, fileRows, shipmentRows } = await loadChildren(
    db,
    rows.map((o) => o.id),
  );
  return rows.map((order) => ({
    order,
    items: items.filter((i) => i.orderId === order.id),
    proofs: proofRows.filter((p) => p.orderId === order.id),
    shipment: shipmentRows.find((s) => s.orderId === order.id) ?? null,
    art: artFor(order.id, proofRows, fileRows),
  }));
}

/** Everything the order page shows. Staff-only data (internal notes) is never loaded here. */
export async function getOrderDetail(db: Db, number: string): Promise<OrderDetail | null> {
  const [order] = await db.select().from(orders).where(eq(orders.number, number.trim().toUpperCase()));
  if (!order) return null;
  const [{ items, proofRows, fileRows, shipmentRows }, events] = await Promise.all([
    loadChildren(db, [order.id]),
    db
      .select()
      .from(orderEvents)
      .where(and(eq(orderEvents.orderId, order.id), eq(orderEvents.customerVisible, true)))
      .orderBy(asc(orderEvents.createdAt)),
  ]);
  return {
    order,
    items,
    proofs: proofRows,
    files: fileRows,
    shipment: shipmentRows[0] ?? null,
    events,
    art: artFor(order.id, proofRows, fileRows),
  };
}

export interface TrackResult {
  number: string;
  status: Order["status"];
  prodStage: Order["prodStage"];
  dueAt: Date | null;
  /** When each tracker stage was first reached. */
  stageTimes: (Date | null)[];
  shipment: Pick<ShipmentRow, "carrier" | "trackingNumber" | "eta" | "shippedAt" | "deliveredAt"> | null;
}

/** First time each of the 8 tracker stages was reached, from the activity log. */
export function stageTimes(events: Pick<EventRow, "status" | "createdAt">[]): (Date | null)[] {
  const out: (Date | null)[] = Array(8).fill(null);
  for (const e of events) {
    if (!e.status) continue;
    const s = STAGE_OF[e.status];
    if (s >= 0 && !out[s]) out[s] = e.createdAt;
  }
  return out;
}

/** Public Track Order lookup: order number + the email it was placed with. Returns only progress, no personal details. */
export async function trackOrder(db: Db, number: string, email: string): Promise<TrackResult | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.number, number.trim().toUpperCase()), eq(sql`lower(${orders.email})`, email.trim().toLowerCase())));
  if (!order) return null;
  const [events, [shipment]] = await Promise.all([
    db
      .select({ status: orderEvents.status, createdAt: orderEvents.createdAt })
      .from(orderEvents)
      .where(and(eq(orderEvents.orderId, order.id), eq(orderEvents.customerVisible, true)))
      .orderBy(asc(orderEvents.createdAt)),
    db.select().from(shipments).where(eq(shipments.orderId, order.id)).orderBy(desc(shipments.shippedAt)).limit(1),
  ]);
  return {
    number: order.number,
    status: order.status,
    prodStage: order.prodStage,
    dueAt: order.dueAt,
    stageTimes: stageTimes(events),
    shipment: shipment
      ? { carrier: shipment.carrier, trackingNumber: shipment.trackingNumber, eta: shipment.eta, shippedAt: shipment.shippedAt, deliveredAt: shipment.deliveredAt }
      : null,
  };
}

export async function listNotifications(db: Db, customerId: string, limit = 8) {
  return db
    .select({
      id: notifications.id,
      title: notifications.title,
      body: notifications.body,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
      orderNumber: orders.number,
    })
    .from(notifications)
    .leftJoin(orders, eq(notifications.orderId, orders.id))
    .where(eq(notifications.customerId, customerId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/** Mark one notification (or all, when id is omitted) as read. Only touches the customer's own notifications. */
export async function markNotificationsRead(db: Db, customerId: string, id?: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.customerId, customerId), isNull(notifications.readAt), id ? eq(notifications.id, id) : undefined));
}

/** Customers with at least one order, for the staff "view as customer" picker. */
export async function listCustomersWithOrders(db: Db) {
  return db
    .select({ id: customers.id, name: customers.name, company: customers.company, email: customers.email, orders: sql<number>`count(${orders.id})::int` })
    .from(customers)
    .innerJoin(orders, eq(orders.customerId, customers.id))
    .groupBy(customers.id)
    .orderBy(asc(customers.name));
}
