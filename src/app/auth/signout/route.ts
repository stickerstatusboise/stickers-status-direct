import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/server/auth/supabase";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}
