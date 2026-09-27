"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Tracker } from "@/components/order/Tracker";
import { trackAction, type TrackState } from "./actions";

export function TrackForm() {
  const [state, action, pending] = useActionState(trackAction, { number: "", email: "" } as TrackState);
  return (
    <>
      <form className="card" action={action} style={{ maxWidth: 760 }}>
        <div className="grid2">
          <div className="field">
            <label htmlFor="t-id">Order number</label>
            <input id="t-id" name="number" placeholder="SSD-1061" defaultValue={state.number} required autoCapitalize="characters" />
          </div>
          <div className="field">
            <label htmlFor="t-email">Email</label>
            <input id="t-email" name="email" type="email" placeholder="you@example.com" defaultValue={state.email} required autoComplete="email" />
          </div>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-red" type="submit" disabled={pending}>
            {pending ? "Looking…" : "Track order"}
          </button>
          <span className="small muted">Your order number is in your confirmation email, e.g. SSD-1061.</span>
        </div>
        {state.error ? (
          <div className="form-err" role="alert" style={{ marginTop: 14, marginBottom: 0 }}>
            {state.error}
          </div>
        ) : null}
      </form>
      {state.result ? (
        <>
          <div style={{ marginTop: 24 }}>
            <Tracker data={state.result} />
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <Link className="btn btn-ink" href={`/account/orders/${state.result.number}`}>
              Open full order
            </Link>
            <span className="small muted">You&apos;ll be asked to sign in with the same email.</span>
          </div>
        </>
      ) : null}
    </>
  );
}
