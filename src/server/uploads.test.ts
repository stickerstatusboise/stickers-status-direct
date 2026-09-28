import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UPLOAD_LIMITS } from "@/lib/uploads";
import * as s from "./db/schema";
import { resetDatabase, seedDatabase } from "./db/seed";
import type { Db } from "./db/types";
import type { Storage } from "./storage";
import { attachUploads, canDownload, cleanupStaleUploads, completeUpload, startUpload, UploadError } from "./uploads";
import { createTestDb } from "./test/db";

/** In-memory stand-in for Supabase Storage. */
function fakeStorage() {
  const objects = new Map<string, Uint8Array>();
  const storage: Storage = {
    async createUploadUrl(bucket, path) {
      return { signedUrl: `https://storage.test/${bucket}/${path}?token=t` };
    },
    async readHead(bucket, path, n) {
      return objects.get(`${bucket}/${path}`)?.subarray(0, n) ?? null;
    },
    async remove(bucket, paths) {
      paths.forEach((p) => objects.delete(`${bucket}/${p}`));
    },
    async downloadUrl(bucket, path) {
      return `https://storage.test/${bucket}/${path}?download`;
    },
  };
  return { storage, objects };
}

const PNG = (w: number, h: number) => {
  const b = new Uint8Array(40);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};

let db: Db;
let fake: ReturnType<typeof fakeStorage>;
const fileRow = async (id: string) => (await db.select().from(s.files).where(eq(s.files.id, id)))[0];
const pathOf = async (id: string) => `artwork/${(await fileRow(id)).path}`;

beforeAll(async () => {
  ({ db } = await createTestDb());
}, 60_000);
beforeEach(async () => {
  await resetDatabase(db);
  await seedDatabase(db, { adminEmail: "owner@example.com" });
  fake = fakeStorage();
});

describe("uploads", () => {
  it("accepts a real PNG and records its pixel size", async () => {
    const up = await startUpload(db, fake.storage, { name: "My Logo.png", size: 40 });
    expect(up.uploadUrl).toContain("uploads/");
    expect((await fileRow(up.fileId)).status).toBe("pending");
    fake.objects.set(await pathOf(up.fileId), PNG(1500, 900));
    const done = await completeUpload(db, fake.storage, up);
    expect(done).toMatchObject({ width: 1500, height: 900 });
    const row = await fileRow(up.fileId);
    expect([row.status, row.mime, row.path.endsWith("/My-Logo.png")]).toEqual(["ready", "image/png", true]);
  });

  it("rejects and deletes a renamed file", async () => {
    const up = await startUpload(db, fake.storage, { name: "logo.pdf", size: 40 });
    const p = await pathOf(up.fileId);
    fake.objects.set(p, PNG(10, 10));
    await expect(completeUpload(db, fake.storage, up)).rejects.toThrow(/doesn't look like a real \.pdf/);
    expect(fake.objects.has(p)).toBe(false);
    expect((await fileRow(up.fileId)).status).toBe("rejected");
  });

  it("refuses bad types, oversize files and wrong secrets", async () => {
    await expect(startUpload(db, fake.storage, { name: "virus.exe", size: 10 })).rejects.toThrow(UploadError);
    await expect(startUpload(db, fake.storage, { name: "huge.psd", size: UPLOAD_LIMITS.maxBytes + 1 })).rejects.toThrow(/over 50 MB/);
    const up = await startUpload(db, fake.storage, { name: "a.png", size: 40 });
    await expect(completeUpload(db, fake.storage, { fileId: up.fileId, token: "wrong" })).rejects.toThrow(/not found/);
    await expect(completeUpload(db, fake.storage, up)).rejects.toThrow(/didn't receive/);
  });

  it("attaches only confirmed uploads with the right secret to an order", async () => {
    const [order] = await db.select().from(s.orders).where(eq(s.orders.number, "SSD-1059"));
    const [item] = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));
    const good = await startUpload(db, fake.storage, { name: "good.png", size: 40 });
    fake.objects.set(await pathOf(good.fileId), PNG(100, 100));
    await completeUpload(db, fake.storage, good);
    const pending = await startUpload(db, fake.storage, { name: "pending.png", size: 40 });
    const attached = await attachUploads(db, [good, pending, { fileId: good.fileId, token: "stolen" }], order.id, item.id);
    expect(attached).toEqual([good.fileId]);
    const row = await fileRow(good.fileId);
    expect([row.orderId, row.orderItemId, row.uploadTokenHash]).toEqual([order.id, item.id, null]);
    // Already attached: can't be claimed again
    expect(await attachUploads(db, [good], order.id, item.id)).toEqual([]);
  });

  it("cleans up week-old uploads that never became part of an order", async () => {
    const old = await startUpload(db, fake.storage, { name: "old.png", size: 40 });
    const fresh = await startUpload(db, fake.storage, { name: "fresh.png", size: 40 });
    fake.objects.set(await pathOf(old.fileId), PNG(1, 1));
    await db.update(s.files).set({ createdAt: new Date(Date.now() - 8 * 864e5) }).where(eq(s.files.id, old.fileId));
    expect(await cleanupStaleUploads(db, fake.storage)).toBe(1);
    expect(await fileRow(old.fileId)).toBeUndefined();
    expect(await fileRow(fresh.fileId)).toBeDefined();
    // Sample order files (no storage bucket rows for uploads) are untouched
    const [{ c }] = await db.execute<{ c: number }>(`select count(*)::int as c from files where order_id is not null`).then((r) => (r as unknown as { rows: { c: number }[] }).rows);
    expect(c).toBeGreaterThan(15);
  });

  it("lets staff, the order's customer and the uploader download; nobody else", async () => {
    const byEmail = async (e: string) => (await db.select().from(s.customers).where(eq(s.customers.email, e)))[0];
    const [jordanOrder] = await db.select().from(s.orders).where(eq(s.orders.number, "SSD-1052"));
    const [f] = await db.select().from(s.files).where(eq(s.files.orderId, jordanOrder.id));
    expect(await canDownload(db, await byEmail("owner@example.com"), f)).toBe(true);
    expect(await canDownload(db, await byEmail("jordan@example.com"), f)).toBe(true);
    expect(await canDownload(db, await byEmail("maya@boisebrew.example"), f)).toBe(false);
    expect(await canDownload(db, null, f)).toBe(false);
    const maya = await byEmail("maya@boisebrew.example");
    const up = await startUpload(db, fake.storage, { name: "mine.png", size: 40, customerId: maya.id });
    expect(await canDownload(db, maya, await fileRow(up.fileId))).toBe(true);
  });
});
