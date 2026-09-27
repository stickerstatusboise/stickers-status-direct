import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { getViewer } from "@/server/auth/session";
import { storageConfigured, supabaseStorage } from "@/server/storage";
import { startUpload, UploadError } from "@/server/uploads";

/** Step 1 of an upload: check name and size, then hand the browser a one-time link to send the file to private storage. */
export async function POST(request: NextRequest) {
  if (!storageConfigured() || !process.env.DATABASE_URL) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; size?: unknown; kind?: unknown };
  try {
    const viewer = await getViewer().catch(() => null);
    const up = await startUpload(getDb(), supabaseStorage(), {
      name: String(body.name ?? ""),
      size: Number(body.size),
      customerId: viewer?.id,
      kind: body.kind === "reference" ? "reference" : "artwork",
    });
    return NextResponse.json(up);
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("upload start failed", e);
    return NextResponse.json({ error: "We couldn't start the upload. Please try again." }, { status: 500 });
  }
}
