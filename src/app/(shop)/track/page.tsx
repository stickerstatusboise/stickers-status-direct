import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/ComingSoon";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <ComingSoon title="Track your order" lede="Enter your order number and email to see exactly where your stickers are.">
      <h2>Order tracking is almost here</h2>
      <p className="muted">
        The live tracker (order received, proof, production, shipping) switches on together with customer accounts. Until then, the shop will
        email you updates.
      </p>
    </ComingSoon>
  );
}
