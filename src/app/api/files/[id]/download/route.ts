import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { files } from "@/server/db/schema";
import { getViewer } from "@/server/auth/session";
import { supabaseStorage } from "@/server/storage";
import { canDownload } from "@/server/uploads";

/** Download the original file through a 5-minute private link. Staff, the order's customer, or the uploader only. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/files/[id]/download">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const db = getDb();
  const [f] = await db.select().from(files).where(eq(files.id, id));
  const viewer = await getViewer();
  // Missing and forbidden look the same
  if (!f || f.status !== "ready" || f.sampleArt || !(await canDownload(db, viewer, f))) return new NextResponse("Not found", { status: 404 });
  const url = await supabaseStorage().downloadUrl(f.bucket, f.path, f.originalName);
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
}
