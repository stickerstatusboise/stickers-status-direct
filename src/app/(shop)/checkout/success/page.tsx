import type { Metadata } from "next";
import Link from "next/link";
import { Tracker } from "@/components/order/Tracker";
import { getDb } from "@/server/db/client";
import { orderForSession } from "@/server/checkout";
import { stripeConfigured, stripePayments } from "@/server/stripe";
import { ClearCart } from "./ClearCart";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default async function CheckoutSuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" && /^cs_[A-Za-z0-9_]+$/.test(sp.session_id) ? sp.session_id : null;
  const order = sessionId && stripeConfigured() ? await orderForSession(getDb(), stripePayments(), sessionId).catch(() => null) : null;

  if (!order)
    return (
      <div className="wrap" style={{ padding: "40px 20px 80px" }}>
        {/* The payment may still be confirming: check again in a few seconds */}
        {sessionId ? <meta httpEquiv="refresh" content="4" /> : null}
        <span className="eyebrow">Almost there</span>
        <h1 style={{ fontSize: "clamp(40px,6vw,76px)" }}>Confirming your payment…</h1>
        <p className="lede" style={{ margin: "14px 0 28px" }}>
          This usually takes a few seconds. This page refreshes on its own. If it doesn&apos;t update, your payment may not have gone through:
          check your email for a receipt from Stripe, or contact the shop.
        </p>
        <Link className="btn btn-line" href="/cart">
          Back to cart
        </Link>
      </div>
    );

  return (
    <div className="wrap" style={{ padding: "40px 20px 80px" }}>
      <ClearCart />
      <span className="eyebrow">Order confirmed</span>
      <h1 style={{ fontSize: "clamp(46px,7vw,92px)" }}>Thanks, {order.name.split(" ")[0]}!</h1>
      <p className="lede" style={{ margin: "14px 0 28px" }}>
        Order <b className="mono">{order.number}</b> is in and paid. Next up: our team reviews your artwork and sends a proof to your account. Sign in
        any time with <b>{order.email}</b> to follow your order and approve your proof.
      </p>
      <Tracker
        data={{ number: order.number, status: order.status, prodStage: order.prodStage, dueAt: order.dueAt, stageTimes: [order.createdAt], shipment: null }}
      />
      <div className="row" style={{ marginTop: 22 }}>
        <Link className="btn btn-red btn-lg" href={`/account/orders/${order.number}`}>
          View your order
        </Link>
        <Link className="btn btn-line btn-lg" href="/stickers">
          Order more stickers
        </Link>
      </div>
    </div>
  );
}
