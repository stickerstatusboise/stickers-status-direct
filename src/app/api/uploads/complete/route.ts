import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { supabaseStorage } from "@/server/storage";
import { completeUpload, UploadError } from "@/server/uploads";

/** Step 2 of an upload: check the file really is what its name says, and read image size. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { fileId?: unknown; token?: unknown };
  try {
    const r = await completeUpload(getDb(), supabaseStorage(), { fileId: String(body.fileId ?? ""), token: String(body.token ?? "") });
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("upload check failed", e);
    return NextResponse.json({ error: "We couldn't check the file. Please try again." }, { status: 500 });
  }
}
