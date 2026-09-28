import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getDb } from "@/server/db/client";
import { stripeEvents } from "@/server/db/schema";
import { fulfillCheckout } from "@/server/checkout";
import { stripe, stripePayments } from "@/server/stripe";

/**
 * Stripe calls this when a checkout is paid. The signature proves the call came from Stripe.
 * Creating the order is safe to repeat, so Stripe's automatic retries can't make duplicates.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new NextResponse("Not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      const order = await fulfillCheckout(getDb(), stripePayments(), session.id);
      console.log(`[stripe] ${event.type} ${session.id} → ${order?.number ?? "not paid yet"}`);
    } catch (e) {
      console.error("[stripe] fulfilment failed", session.id, e);
      return new NextResponse("Fulfilment failed", { status: 500 }); // Stripe retries
    }
  }
  await getDb().insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
  return NextResponse.json({ received: true });
}
