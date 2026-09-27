import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/ComingSoon";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <ComingSoon title="Your account" lede="Sign in to approve proofs, track orders and reorder.">
      <h2>Accounts are coming soon</h2>
      <p className="muted">Sign-in, your orders, proof approval and one-click reorder are the next part of the build.</p>
    </ComingSoon>
  );
}
