import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { isStaff } from "@/server/auth/customers";
import { getViewer } from "@/server/auth/session";
import { listNotifications } from "@/server/queries";

export const dynamic = "force-dynamic";

export interface MeResponse {
  signedIn: boolean;
  name?: string;
  staff?: boolean;
  notifications?: { id: string; title: string; body: string; createdAt: string; read: boolean; orderNumber: string | null }[];
}

/** Who's signed in and their latest notifications, for the header bell. */
export async function GET() {
  let body: MeResponse = { signedIn: false };
  try {
    const viewer = await getViewer();
    if (viewer) {
      const notes = await listNotifications(getDb(), viewer.id, 6);
      body = {
        signedIn: true,
        name: viewer.name,
        staff: isStaff(viewer),
        notifications: notes.map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.createdAt.toISOString(), read: !!n.readAt, orderNumber: n.orderNumber })),
      };
    }
  } catch {
    // Sign-in or database not configured: behave as signed out
  }
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
