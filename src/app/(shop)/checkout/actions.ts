"use server";

import { headers } from "next/headers";
import { getDb } from "@/server/db/client";
import { CheckoutError, createCheckout, type CheckoutInput } from "@/server/checkout";
import { stripeConfigured, stripePayments } from "@/server/stripe";

export async function startCheckoutAction(input: CheckoutInput): Promise<{ url?: string; error?: string }> {
  if (!stripeConfigured() || !process.env.DATABASE_URL) return { error: "Online payment isn't switched on yet." };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  try {
    const { url } = await createCheckout(getDb(), stripePayments(), input, `${proto}://${host}`);
    return { url };
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    console.error("checkout failed", e);
    return { error: "We couldn't start checkout. Please try again in a moment." };
  }
}
