import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutView } from "@/components/cart/CheckoutView";
import { getViewer } from "@/server/auth/session";
import { stripeConfigured } from "@/server/stripe";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const sp = await searchParams;
  const me = await getViewer().catch(() => null);
  return (
    <div className="wrap">
      <div className="page-hd">
        <div className="crumbs">
          <Link href="/cart">Cart</Link>
          <span>/</span>
          <span>Checkout</span>
        </div>
        <h1>Checkout</h1>
      </div>
      <CheckoutView
        paymentsReady={stripeConfigured()}
        canceled={sp.canceled === "1"}
        prefill={me ? { name: me.name, email: me.email, phone: me.phone ?? "", address: me.defaultAddress } : null}
      />
    </div>
  );
}
