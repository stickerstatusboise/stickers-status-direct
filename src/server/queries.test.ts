import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { isStaff, linkCustomer, safeNext, updateProfile } from "./auth/customers";
import * as s from "./db/schema";
import { resetDatabase, seedDatabase } from "./db/seed";
import type { Db } from "./db/types";
import {
  canViewOrder,
  getOrderDetail,
  listCustomersWithOrders,
  listNotifications,
  listOrdersForCustomer,
  markNotificationsRead,
  trackOrder,
} from "./queries";
import { createTestDb } from "./test/db";

let db: Db;
const customerByEmail = async (email: string) => (await db.select().from(s.customers).where(eq(s.customers.email, email)))[0];

beforeAll(async () => {
  ({ db } = await createTestDb());
}, 60_000);
beforeEach(async () => {
  await resetDatabase(db);
  await seedDatabase(db, { adminEmail: "owner@example.com" });
});

describe("linkCustomer", () => {
  it("links a sample customer by email on first sign-in, then by account id", async () => {
    const c = await linkCustomer(db, { id: "11111111-1111-4111-8111-111111111111", email: "Jordan@Example.com" });
    expect(c.name).toBe("Jordan Reyes");
    expect(c.authUserId).toBe("11111111-1111-4111-8111-111111111111");
    const again = await linkCustomer(db, { id: "11111111-1111-4111-8111-111111111111", email: "jordan@example.com" });
    expect(again.id).toBe(c.id);
  });
  it("creates a new customer for a new email", async () => {
    const c = await linkCustomer(db, { id: "22222222-2222-4222-8222-222222222222", email: "new.person@example.com" });
    expect([c.email, c.name, c.role]).toEqual(["new.person@example.com", "new.person", "customer"]);
  });
  it("knows who is staff", async () => {
    expect(isStaff(await customerByEmail("owner@example.com"))).toBe(true);
    expect(isStaff(await customerByEmail("jordan@example.com"))).toBe(false);
  });
});

describe("safeNext", () => {
  it("only allows same-site paths", () => {
    expect(safeNext("/account/orders/SSD-1057")).toBe("/account/orders/SSD-1057");
    expect(safeNext("https://evil.example")).toBe("/account");
    expect(safeNext("//evil.example")).toBe("/account");
    expect(safeNext("/\\evil.example")).toBe("/account");
    expect(safeNext(undefined)).toBe("/account");
  });
});

describe("customer order queries", () => {
  it("lists a customer's own orders, newest first, with thumbnails", async () => {
    const jordan = await customerByEmail("jordan@example.com");
    const list = await listOrdersForCustomer(db, jordan.id);
    expect(list.map((o) => o.order.number)).toEqual(["SSD-1057", "SSD-1052", "SSD-1046", "SSD-1041"]);
    expect(list[0].art).toBe("fuel-v1");
    expect(list[1].art).toBe("sendit");
    expect(list.find((o) => o.order.number === "SSD-1046")?.shipment?.carrier).toBe("USPS");
  });

  it("loads an order's details without staff notes", async () => {
    const d = await getOrderDetail(db, "ssd-1053");
    expect(d?.order.number).toBe("SSD-1053");
    expect(d?.proofs[0].customerNote).toMatch(/EST\. 1998/);
    expect(d?.proofs[0].file?.sampleArt).toBe("flame");
    expect(d?.events.at(-1)?.status).toBe("changes_requested");
    expect(Object.keys(d!)).not.toContain("notes");
    expect(await getOrderDetail(db, "SSD-9999")).toBeNull();
  });

  it("lets owners and staff view an order, nobody else", async () => {
    const d = (await getOrderDetail(db, "SSD-1057"))!;
    expect(canViewOrder(await customerByEmail("jordan@example.com"), d.order)).toBe(true);
    expect(canViewOrder(await customerByEmail("maya@boisebrew.example"), d.order)).toBe(false);
    expect(canViewOrder(await customerByEmail("owner@example.com"), d.order)).toBe(true);
    expect(canViewOrder(null, d.order)).toBe(false);
  });
});

describe("trackOrder", () => {
  it("needs the right order number and email", async () => {
    const t = await trackOrder(db, " ssd-1052 ", "JORDAN@example.com");
    expect(t?.status).toBe("production");
    expect(t?.stageTimes.slice(0, 5).every(Boolean)).toBe(true);
    expect(t?.stageTimes[5]).toBeNull();
    expect(await trackOrder(db, "SSD-1052", "maya@boisebrew.example")).toBeNull();
  });
  it("includes tracking once shipped", async () => {
    expect((await trackOrder(db, "SSD-1046", "jordan@example.com"))?.shipment?.trackingNumber).toBe("9400111899223300112233");
  });
});

describe("notifications", () => {
  it("lists newest first and marks read", async () => {
    const jordan = await customerByEmail("jordan@example.com");
    const list = await listNotifications(db, jordan.id);
    expect(list.map((n) => n.orderNumber)).toEqual(["SSD-1057", "SSD-1046", "SSD-1052"]);
    expect(list[0].readAt).toBeNull();
    await markNotificationsRead(db, jordan.id, list[0].id);
    expect((await listNotifications(db, jordan.id))[0].readAt).not.toBeNull();
  });
  it("can't touch another customer's notifications", async () => {
    const jordan = await customerByEmail("jordan@example.com");
    const maya = await customerByEmail("maya@boisebrew.example");
    const [n] = await listNotifications(db, jordan.id);
    await markNotificationsRead(db, maya.id, n.id);
    expect((await listNotifications(db, jordan.id))[0].readAt).toBeNull();
  });
});

describe("staff helpers and profile", () => {
  it("lists customers with orders for the staff preview", async () => {
    const list = await listCustomersWithOrders(db);
    expect(list).toHaveLength(12);
    expect(list.find((c) => c.email === "jordan@example.com")?.orders).toBe(4);
  });
  it("updates account info", async () => {
    const jordan = await customerByEmail("jordan@example.com");
    const row = await updateProfile(db, jordan.id, { name: " Jordan R. ", phone: "", company: "Reyes Detailing", address: { line1: "1 Main", city: "Boise", state: "ID", zip: "83702" } });
    expect([row.name, row.phone, row.company, row.defaultAddress?.city]).toEqual(["Jordan R.", null, "Reyes Detailing", "Boise"]);
    await expect(updateProfile(db, jordan.id, { name: "  " })).rejects.toThrow(/name/);
  });
});
