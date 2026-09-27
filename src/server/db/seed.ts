/** Writes the prototype's sample data (seed-data.ts) into the database. Used by scripts/seed.ts and the tests. */
import { eq, sql } from "drizzle-orm";
import { buildSeed, type SeedData } from "./seed-data";
import * as s from "./schema";
import type { Db } from "./types";

const ALL_TABLES = [
  "notifications",
  "shipments",
  "internal_notes",
  "order_events",
  "proofs",
  "files",
  "order_items",
  "orders",
  "customers",
  "stripe_events",
  "quote_requests",
];

/** Delete every row (TRUNCATE skips the proof lock, which is intended for real edits, not a demo reset). */
export async function resetDatabase(db: Db) {
  await db.execute(sql.raw(`TRUNCATE ${ALL_TABLES.join(", ")} RESTART IDENTITY CASCADE`));
  await db.execute(sql`SELECT setval('order_number_seq', 1061, false)`);
}

const actorType = (name: string) => (name === "Customer" ? "customer" : name === "System" ? "system" : "staff") as "customer" | "system" | "staff";

export async function seedDatabase(db: Db, opts: { now?: Date; adminEmail?: string } = {}, data: SeedData = buildSeed(opts.now)) {
  return db.transaction(async (tx) => {
    const ids = new Map<string, string>();
    for (const c of data.customers) {
      const [row] = await tx
        .insert(s.customers)
        .values({ email: c.email, name: c.name, phone: c.phone, company: c.company, defaultAddress: c.address, createdAt: c.createdAt })
        .returning({ id: s.customers.id });
      ids.set(c.key, row.id);
    }
    if (opts.adminEmail) {
      const email = opts.adminEmail.trim().toLowerCase();
      await tx
        .insert(s.customers)
        .values({ email, name: "Sticker Status", role: "admin" })
        .onConflictDoUpdate({ target: s.customers.email, set: { role: "admin" } });
    }

    const orderIds = new Map<string, string>();
    for (const o of data.orders) {
      const c = data.customers.find((x) => x.key === o.customerKey)!;
      const [order] = await tx
        .insert(s.orders)
        .values({
          number: o.number,
          customerId: ids.get(o.customerKey)!,
          email: c.email,
          name: c.name,
          phone: c.phone,
          company: c.company,
          shipAddress: c.address,
          billAddress: c.address,
          shipMethod: o.shipMethod,
          subtotalCents: o.subtotalCents,
          shippingCents: o.shippingCents,
          taxCents: o.taxCents,
          totalCents: o.totalCents,
          status: o.status,
          prodStage: o.prodStage,
          isRush: o.isRush,
          approvedAt: o.approvedAt,
          dueAt: o.dueAt,
          paymentStatus: "paid",
          cardBrand: "Visa",
          cardLast4: "4242",
          createdAt: o.createdAt,
        })
        .returning();
      orderIds.set(o.number, order.id);

      for (const [position, it] of o.items.entries()) {
        const [row] = await tx
          .insert(s.orderItems)
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
            priceCents: it.priceCents,
            priceLines: it.priceLines,
            pricingVersion: it.pricingVersion,
          })
          .returning({ id: s.orderItems.id });
        await tx.insert(s.files).values({
          kind: it.cfg.designHelp && ["jpg", "png"].includes(it.file.ext) ? "reference" : "artwork",
          bucket: "artwork",
          path: `seed/${o.number}/${it.file.name}`,
          originalName: it.file.name,
          ext: it.file.ext,
          sizeBytes: it.file.sizeBytes,
          sampleArt: it.file.art,
          orderId: order.id,
          orderItemId: row.id,
          uploadedBy: ids.get(o.customerKey),
          createdAt: o.createdAt,
        });
      }

      for (const p of o.proofs) {
        const [file] = await tx
          .insert(s.files)
          .values({
            kind: "proof",
            bucket: "proofs",
            path: `seed/${o.number}/proof-v${p.version}.pdf`,
            originalName: `${o.number}-proof-v${p.version}.pdf`,
            ext: "pdf",
            sizeBytes: 1200000,
            sampleArt: p.art,
            orderId: order.id,
            createdAt: p.sentAt,
          })
          .returning({ id: s.files.id });
        const [proof] = await tx
          .insert(s.proofs)
          .values({
            orderId: order.id,
            version: p.version,
            fileId: file.id,
            staffMessage: p.staffMessage,
            status: p.status,
            customerNote: p.note,
            sentAt: p.sentAt,
            respondedAt: p.respondedAt,
          })
          .returning({ id: s.proofs.id });
        if (p.status === "approved") await tx.update(s.orders).set({ approvedProofId: proof.id }).where(eq(s.orders.id, order.id));
      }

      if (o.events.length)
        await tx.insert(s.orderEvents).values(
          o.events.map((e) => ({ orderId: order.id, status: e.status, text: e.text, actor: actorType(e.actorName), actorName: e.actorName, createdAt: e.at })),
        );
      if (o.notes.length) await tx.insert(s.internalNotes).values(o.notes.map((n) => ({ orderId: order.id, authorName: n.authorName, text: n.text, createdAt: n.at })));
      if (o.shipment) await tx.insert(s.shipments).values({ orderId: order.id, ...o.shipment });
    }

    if (data.notifications.length)
      await tx.insert(s.notifications).values(
        data.notifications.map((n) => ({
          customerId: ids.get(n.customerKey)!,
          orderId: orderIds.get(n.orderNumber),
          kind: n.kind,
          title: n.title,
          body: n.body,
          createdAt: n.at,
          readAt: n.read ? n.at : null,
        })),
      );

    return { customers: data.customers.length, orders: data.orders.length };
  });
}
