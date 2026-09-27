"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db/client";
import { linkCustomer, safeNext } from "@/server/auth/customers";
import { createSupabaseServer } from "@/server/auth/supabase";

export interface LoginState {
  step: "email" | "code";
  email: string;
  next: string;
  error?: string;
  info?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Step 1: email the customer a sign-in link and 6-digit code. New emails get an account automatically. */
export async function sendLoginCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(form.get("next"));
  if (!EMAIL_RE.test(email)) return { step: "email", email, next, error: "Enter a valid email address." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    const wait = /rate|seconds|too many/i.test(error.message);
    return { step: "email", email, next, error: wait ? "Too many sign-in emails. Wait a minute and try again." : "We couldn't send the email. Try again in a moment." };
  }
  return { step: "code", email, next, info: `We sent a sign-in email to ${email}.` };
}

/** Step 2: the 6-digit code from the email (works even if the email was opened on another device). */
export async function verifyLoginCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(form.get("next"));
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  const state: LoginState = { step: "code", email, next };
  if (token.length < 6) return { ...state, error: "Enter the code from the email." };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user?.email) return { ...state, error: "That code didn't work. Check it, or send a new email." };
  await linkCustomer(getDb(), { id: data.user.id, email: data.user.email });
  redirect(next);
}
