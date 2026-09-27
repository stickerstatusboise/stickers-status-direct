/**
 * Artwork uploads: the browser asks for a one-time upload link, sends the file straight to private storage,
 * then asks us to confirm it. We read the file's first bytes and keep it only if it really is the type its name says.
 * Files that never become part of an order are deleted after a week.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import { detectFileType, extOf, imageSize, MIME, precheck, safeFileName, typeMatchesExt, UPLOAD_LIMITS } from "@/lib/uploads";
import { files, orders, type Customer } from "./db/schema";
import type { Db } from "./db/types";
import { isStaff } from "./auth/customers";
import { BUCKETS, type Storage } from "./storage";

export class UploadError extends Error {}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export interface StartedUpload {
  fileId: string;
  token: string;
  uploadUrl: string;
}

export async function startUpload(
  db: Db,
  storage: Storage,
  input: { name: string; size: number; customerId?: string | null; kind?: "artwork" | "reference" },
): Promise<StartedUpload> {
  const name = String(input.name ?? "").slice(0, 200);
  const size = Math.floor(Number(input.size));
  const problem = precheck(name, size);
  if (problem) throw new UploadError(problem);

  const id = randomUUID();
  const token = randomBytes(24).toString("base64url");
  const ext = extOf(name);
  const month = new Date().toISOString().slice(0, 7);
  const path = `uploads/${month}/${id}/${safeFileName(name)}`;
  const { signedUrl } = await storage.createUploadUrl(BUCKETS.artwork, path);
  await db.insert(files).values({
    id,
    kind: input.kind ?? "artwork",
    bucket: BUCKETS.artwork,
    path,
    originalName: name,
    mime: MIME[ext] ?? null,
    ext,
    sizeBytes: size,
    status: "pending",
    uploadTokenHash: hash(token),
    uploadedBy: input.customerId ?? null,
  });
  return { fileId: id, token, uploadUrl: signedUrl };
}

async function ownFile(db: Db, fileId: string, token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(fileId) || !token) throw new UploadError("Upload not found");
  const [f] = await db.select().from(files).where(eq(files.id, fileId));
  if (!f || !f.uploadTokenHash || f.uploadTokenHash !== hash(token)) throw new UploadError("Upload not found");
  return f;
}

/** Check the uploaded bytes. Rejected files are deleted from storage straight away. */
export async function completeUpload(db: Db, storage: Storage, input: { fileId: string; token: string }) {
  const f = await ownFile(db, input.fileId, input.token);
  if (f.status === "ready") return { fileId: f.id, width: f.width, height: f.height };
  if (f.status !== "pending") throw new UploadError("This file was rejected. Please upload it again.");

  const head = await storage.readHead(f.bucket, f.path, UPLOAD_LIMITS.headBytes);
  if (!head || !head.length) throw new UploadError("We didn't receive the file. Please try again.");
  if (!typeMatchesExt(f.ext, detectFileType(head))) {
    await storage.remove(f.bucket, [f.path]);
    await db.update(files).set({ status: "rejected" }).where(eq(files.id, f.id));
    throw new UploadError(`${f.originalName} doesn't look like a real .${f.ext} file. Please export it again and re-upload.`);
  }
  const dims = imageSize(head);
  await db
    .update(files)
    .set({ status: "ready", width: dims?.width ?? null, height: dims?.height ?? null })
    .where(eq(files.id, f.id));
  return { fileId: f.id, width: dims?.width ?? null, height: dims?.height ?? null };
}

/**
 * Checkout (step 5): attach the customer's uploads to their new order item. Only files whose secret matches,
 * that passed the check and aren't already on an order, are attached.
 */
export async function attachUploads(db: Db, refs: { fileId: string; token: string }[], orderId: string, orderItemId: string) {
  const attached: string[] = [];
  for (const r of refs) {
    const f = await ownFile(db, r.fileId, r.token).catch(() => null);
    if (!f || f.status !== "ready" || f.orderId) continue;
    await db.update(files).set({ orderId, orderItemId, uploadTokenHash: null }).where(eq(files.id, f.id));
    attached.push(f.id);
  }
  return attached;
}

/** Delete uploads that never made it onto an order. */
export async function cleanupStaleUploads(db: Db, storage: Storage, olderThanDays = 7) {
  const cutoff = new Date(Date.now() - olderThanDays * 864e5);
  const stale = await db
    .select({ id: files.id, bucket: files.bucket, path: files.path })
    .from(files)
    .where(and(isNull(files.orderId), eq(files.bucket, BUCKETS.artwork), lt(files.createdAt, cutoff)));
  if (!stale.length) return 0;
  await storage.remove(
    BUCKETS.artwork,
    stale.map((f) => f.path),
  );
  await db.delete(files).where(
    inArray(
      files.id,
      stale.map((f) => f.id),
    ),
  );
  return stale.length;
}

/** Who may download a file: staff; the customer whose order it's on; or whoever uploaded it before checkout. */
export async function canDownload(db: Db, viewer: Customer | null, file: typeof files.$inferSelect) {
  if (!viewer) return false;
  if (isStaff(viewer)) return true;
  if (file.uploadedBy && file.uploadedBy === viewer.id) return true;
  if (!file.orderId) return false;
  const [o] = await db.select({ customerId: orders.customerId }).from(orders).where(eq(orders.id, file.orderId));
  return o?.customerId === viewer.id;
}
