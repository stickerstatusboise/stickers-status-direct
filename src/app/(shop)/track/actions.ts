"use server";

import type { TrackerData } from "@/components/order/Tracker";
import { getDb } from "@/server/db/client";
import { trackOrder } from "@/server/queries";

export interface TrackState {
  number: string;
  email: string;
  result?: TrackerData;
  error?: string;
}

export async function trackAction(_prev: TrackState, form: FormData): Promise<TrackState> {
  const number = String(form.get("number") ?? "").trim().toUpperCase().slice(0, 20);
  const email = String(form.get("email") ?? "").trim().slice(0, 200);
  if (!number || !email) return { number, email, error: "Enter your order number and email." };
  if (!process.env.DATABASE_URL) return { number, email, error: "Order tracking isn't available right now. Please try again later." };
  const t = await trackOrder(getDb(), number, email);
  // Same message whether the order doesn't exist or the email doesn't match, so this can't be used to probe order numbers
  if (!t) return { number, email, error: "We couldn't find that order. Check the order number and the email you ordered with." };
  return { number, email, result: t };
}
