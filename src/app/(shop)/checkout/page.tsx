import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutView } from "@/components/cart/CheckoutView";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
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
      <CheckoutView />
    </div>
  );
}
