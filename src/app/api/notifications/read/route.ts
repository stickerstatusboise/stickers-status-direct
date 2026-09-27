import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { getViewer } from "@/server/auth/session";
import { markNotificationsRead } from "@/server/queries";

/** Mark one notification read ({ id }), or all of the customer's notifications when no id is sent. */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  const id = typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : undefined;
  await markNotificationsRead(getDb(), viewer.id, id);
  return NextResponse.json({ ok: true });
}
