"use client";

import { useToast } from "@/components/ui/Toast";
import { CATALOG } from "@/lib/catalog";

/** Quote request form. Not sent anywhere yet: saving and emailing quote requests arrives with the database and email steps. */
export function QuoteForm() {
  const toast = useToast();
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        e.currentTarget.reset();
        toast("Thanks! Quote requests aren't being sent yet", "This preview doesn't send them. Call or email the shop in the meantime.");
      }}
    >
      <h2>Get a quote</h2>
      <p className="muted" style={{ margin: "-6px 0 18px" }}>
        We reply within one business day.
      </p>
      <div className="stack">
        <div className="grid2">
          <div className="field">
            <label htmlFor="q-name">Name</label>
            <input id="q-name" name="name" required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="q-co">Company</label>
            <input id="q-co" name="company" autoComplete="organization" />
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="q-email">Email</label>
            <input id="q-email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="q-phone">Phone</label>
            <input id="q-phone" name="phone" type="tel" autoComplete="tel" />
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="q-type">Sticker type</label>
            <select id="q-type" name="type">
              {CATALOG.products.map((p) => (
                <option key={p.id}>{p.name}</option>
              ))}
              <option>Not sure yet</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="q-qty">Estimated quantity</label>
            <input id="q-qty" name="qty" placeholder="e.g. 5,000 across 3 designs" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="q-notes">Tell us about the project</label>
          <textarea id="q-notes" name="notes" placeholder="Sizes, number of designs, deadline, where they'll be used…" />
        </div>
        <div className="field">
          <label htmlFor="q-file">Artwork (optional)</label>
          <input id="q-file" name="file" type="file" accept={CATALOG.uploadTypes.map((t) => "." + t).join(",")} />
        </div>
        <button className="btn btn-red btn-lg" type="submit">
          Request quote
        </button>
      </div>
    </form>
  );
}
