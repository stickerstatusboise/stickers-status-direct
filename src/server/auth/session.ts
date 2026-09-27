import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "../db/client";
import type { Customer } from "../db/schema";
import { isStaff, linkCustomer } from "./customers";
import { createSupabaseServer, supabaseEnv } from "./supabase";

/** The signed-in customer (or staff member), or null. Cached for the length of one request. */
export const getViewer = cache(async (): Promise<Customer | null> => {
  if (!supabaseEnv()) return null;
  const supabase = await createSupabaseServer();
  // getUser() checks the session with Supabase, so a forged cookie can't pass.
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  return linkCustomer(getDb(), { id: data.user.id, email: data.user.email });
});

export async function requireCustomer(next: string): Promise<Customer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** Staff pages. Signed-out visitors go to sign-in; signed-in customers get a plain 404 (the page "doesn't exist" for them). */
export async function requireStaff(next: string): Promise<Customer> {
  const viewer = await requireCustomer(next);
  if (!isStaff(viewer)) notFound();
  return viewer;
}
