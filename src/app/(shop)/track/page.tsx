import type { Metadata } from "next";
import { TrackForm } from "./TrackForm";

export const metadata: Metadata = {
  title: "Track your order",
  description: "See where your Sticker Status Direct order is, from proof to production to your door.",
  alternates: { canonical: "/track" },
};

export default function TrackPage() {
  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <div className="page-hd">
        <h1>Track your order</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          Enter your order number and the email you ordered with.
        </p>
      </div>
      <TrackForm />
    </div>
  );
}
