import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { linkCustomer, safeNext } from "@/server/auth/customers";
import { createSupabaseServer } from "@/server/auth/supabase";

/** Where the sign-in email link lands. Handles both link styles Supabase can send. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createSupabaseServer();

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { data: { user: null }, error: new Error("missing code") };

  if (error || !data.user?.email) return NextResponse.redirect(new URL(`/login?error=link&next=${encodeURIComponent(next)}`, url.origin));
  await linkCustomer(getDb(), { id: data.user.id, email: data.user.email });
  return NextResponse.redirect(new URL(next, url.origin));
}
