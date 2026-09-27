"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db/client";
import { orders } from "@/server/db/schema";
import { updateProfile } from "@/server/auth/customers";
import { getViewer } from "@/server/auth/session";
import { approveProof, OrderRuleError, requestChanges, type Actor } from "@/server/orders";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** The signed-in customer, and their order with this number. Staff viewing someone else's order get nothing: only the customer can approve. */
async function ownOrder(number: string) {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please sign in again." } as const;
  const [order] = await getDb().select().from(orders).where(eq(orders.number, number));
  if (!order || order.customerId !== viewer.id) return { error: "Only the customer who placed this order can respond to its proof." } as const;
  const actor: Actor = { type: "customer", id: viewer.id, name: "Customer" };
  return { order, actor } as const;
}

const fail = (e: unknown): ActionResult => ({ ok: false, error: e instanceof OrderRuleError ? e.message : "Something went wrong. Please try again." });

export async function approveProofAction(number: string, confirmed: boolean): Promise<ActionResult> {
  if (!confirmed) return { ok: false, error: "Please confirm you checked the proof." };
  const own = await ownOrder(number);
  if ("error" in own) return { ok: false, error: own.error };
  try {
    await approveProof(getDb(), own.order.id, own.actor);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/account/orders/${number}`);
  revalidatePath("/account");
  return { ok: true };
}

export async function requestChangesAction(number: string, note: string): Promise<ActionResult> {
  if (!note.trim()) return { ok: false, error: "Tell us what to change." };
  if (note.length > 2000) return { ok: false, error: "Please keep your note under 2,000 characters." };
  const own = await ownOrder(number);
  if ("error" in own) return { ok: false, error: own.error };
  try {
    await requestChanges(getDb(), own.order.id, note, own.actor);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/account/orders/${number}`);
  revalidatePath("/account");
  return { ok: true };
}

export async function updateAccountAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Please sign in again." };
  const v = (k: string) => String(form.get(k) ?? "").slice(0, 200);
  try {
    await updateProfile(getDb(), viewer.id, {
      name: v("name"),
      phone: v("phone"),
      company: v("company"),
      address: { line1: v("line1"), line2: v("line2"), city: v("city"), state: v("state"), zip: v("zip") },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save." };
  }
  revalidatePath("/account");
  return { ok: true };
}
