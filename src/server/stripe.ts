/* Server code only (uses the Stripe secret key). */
import Stripe from "stripe";
import type { Payments } from "./checkout";

export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Payments aren't set up: add STRIPE_SECRET_KEY.");
  if (!client) {
    // STRIPE_API_HOST is only for local testing against a stand-in server, e.g. "127.0.0.1:12111"
    const local = process.env.STRIPE_API_HOST?.split(":");
    client = new Stripe(key, local ? { host: local[0], port: Number(local[1] ?? 80), protocol: "http" } : {});
  }
  return client;
}

export function stripePayments(): Payments {
  const s = stripe();
  return {
    async createSession({ checkoutId, email, lines, successUrl, cancelUrl }) {
      const session = await s.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: email,
          client_reference_id: checkoutId,
          metadata: { checkoutId },
          payment_intent_data: { metadata: { checkoutId } },
          line_items: lines.map((l) => ({
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: l.amountCents,
              product_data: { name: l.name, ...(l.description ? { description: l.description.slice(0, 500) } : {}) },
            },
          })),
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
        { idempotencyKey: `checkout-${checkoutId}` },
      );
      if (!session.url) throw new Error("Stripe didn't return a checkout page");
      return { id: session.id, url: session.url };
    },

    async getSession(id) {
      const session = await s.checkout.sessions.retrieve(id, { expand: ["payment_intent.latest_charge"] }).catch(() => null);
      if (!session) return null;
      const pi = typeof session.payment_intent === "object" ? session.payment_intent : null;
      const charge = pi && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
      const card = charge?.payment_method_details?.card;
      return {
        id: session.id,
        paid: session.payment_status === "paid",
        checkoutId: session.metadata?.checkoutId ?? session.client_reference_id ?? null,
        amountTotal: session.amount_total,
        paymentIntentId: pi?.id ?? (typeof session.payment_intent === "string" ? session.payment_intent : null),
        cardBrand: card?.brand ? card.brand[0].toUpperCase() + card.brand.slice(1) : null,
        cardLast4: card?.last4 ?? null,
      };
    },
  };
}
