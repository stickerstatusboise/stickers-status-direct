import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { storageConfigured, supabaseStorage } from "@/server/storage";
import { cleanupStaleUploads } from "@/server/uploads";

/** Daily (vercel.json): delete uploads older than 7 days that never became part of an order. Needs CRON_SECRET. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  if (!storageConfigured()) return NextResponse.json({ deleted: 0, note: "storage not configured" });
  const deleted = await cleanupStaleUploads(getDb(), supabaseStorage());
  return NextResponse.json({ deleted });
}
