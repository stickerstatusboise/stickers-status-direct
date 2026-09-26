import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="wrap">
      <div className="page-hd">
        <h1>Your cart</h1>
      </div>
      <CartView />
    </div>
  );
}
