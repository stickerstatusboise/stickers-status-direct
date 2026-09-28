"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { startCheckoutAction } from "@/app/(shop)/checkout/actions";
import type { Address } from "@/server/db/schema";
import { Icon } from "@/components/ui/Icon";
import { CATALOG, getMaterial, getProduct, getShipping, type ShippingId } from "@/lib/catalog";
import { dimLabel } from "@/lib/config";
import { fmtQty, money } from "@/lib/format";
import { calculatePrice, cartTotals } from "@/lib/pricing";
import { useCart } from "./cart-store";
import { ItemSticker } from "./ItemSticker";

function Field({ id, label, name, type = "text", required = true, autoComplete, inputMode, defaultValue }: {
  id: string;
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  defaultValue?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} required={required} autoComplete={autoComplete} inputMode={inputMode} defaultValue={defaultValue} maxLength={200} />
    </div>
  );
}

/**
 * Checkout form. On submit the server checks and reprices the whole cart (the prices shown here are only a preview),
 * then sends the customer to Stripe's secure payment page.
 */
export function CheckoutView({
  paymentsReady,
  canceled,
  prefill,
}: {
  paymentsReady: boolean;
  canceled?: boolean;
  prefill: { name: string; email: string; phone: string; address: Address | null } | null;
}) {
  const items = useCart();
  const [shipMethod, setShipMethod] = useState<ShippingId>("standard");
  const [sameBill, setSameBill] = useState(true);
  const [error, setError] = useState(canceled ? "Payment canceled. Your cart is saved; place the order again when you're ready." : "");
  const [pending, start] = useTransition();

  if (items === null) return <div style={{ minHeight: 320 }} />;
  if (!items.length)
    return (
      <div className="card empty" style={{ marginBottom: 80 }}>
        <h2>Your cart is empty</h2>
        <Link className="btn btn-red btn-lg" href="/stickers">
          Order Stickers
        </Link>
      </div>
    );

  const priced = items.map((it) => ({ it, price: calculatePrice(it) }));
  const sub = priced.reduce((s, x) => s + x.price.totalCents, 0);
  const t = cartTotals(sub, getShipping(shipMethod));

  const submit = (form: HTMLFormElement) => {
    const v = (k: string) => String(new FormData(form).get(k) ?? "").trim();
    const missing = ["name", "email", "phone", "line1", "city", "state", "zip", ...(sameBill ? [] : ["b_line1", "b_city", "b_state", "b_zip"])].filter((k) => !v(k));
    if (missing.length) {
      setError("Please fill in all the required fields.");
      form.querySelector<HTMLInputElement>(`[name="${missing[0]}"]`)?.focus();
      return;
    }
    // Artwork that never reached storage (added before uploads were switched on) has to be uploaded again
    const stale = items.find((it) => it.files.length && !it.files.some((f) => f.fileId) && !it.designHelp);
    if (stale) {
      setError(`Please edit your ${getProduct(stale.productId).name.toLowerCase()} and upload the artwork again.`);
      return;
    }
    setError("");
    start(async () => {
      const r = await startCheckoutAction({
        contact: { name: v("name"), email: v("email"), phone: v("phone") },
        ship: { line1: v("line1"), line2: v("line2"), city: v("city"), state: v("state"), zip: v("zip") },
        bill: sameBill ? null : { line1: v("b_line1"), city: v("b_city"), state: v("b_state"), zip: v("b_zip") },
        shipMethod,
        items: items.map((it) => ({
          productId: it.productId,
          shape: it.shape,
          size: it.size,
          cw: it.cw,
          ch: it.ch,
          qty: it.qty,
          material: it.material,
          options: it.options,
          designHelp: it.designHelp,
          designNotes: it.designNotes,
          enhance: it.enhance,
          artFit: it.artFit,
          files: it.files.filter((f) => f.fileId && f.token).map((f) => ({ fileId: f.fileId!, token: f.token! })),
        })),
      });
      if (r.url) window.location.assign(r.url);
      else setError(r.error ?? "Something went wrong. Please try again.");
    });
  };
  const a = prefill?.address;

  return (
    <form
      className="two-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      <div>
        <div className="card">
          <h2>Contact</h2>
          <div className="stack">
            <Field id="co-name" label="Full name" name="name" autoComplete="name" defaultValue={prefill?.name} />
            <div className="grid2">
              <Field id="co-email" label="Email" name="email" type="email" autoComplete="email" defaultValue={prefill?.email} />
              <Field id="co-phone" label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={prefill?.phone} />
            </div>
            <p className="small muted">We send your proof and tracking updates here. An account is created so you can approve proofs and track your order.</p>
          </div>
        </div>
        <div className="card">
          <h2>Shipping address</h2>
          <div className="stack">
            <Field id="co-a1" label="Street address" name="line1" autoComplete="address-line1" defaultValue={a?.line1} />
            <Field id="co-a2" label="Apt, suite (optional)" name="line2" required={false} autoComplete="address-line2" defaultValue={a?.line2} />
            <div className="grid3">
              <Field id="co-city" label="City" name="city" autoComplete="address-level2" defaultValue={a?.city} />
              <Field id="co-state" label="State" name="state" autoComplete="address-level1" defaultValue={a?.state} />
              <Field id="co-zip" label="ZIP" name="zip" autoComplete="postal-code" inputMode="numeric" defaultValue={a?.zip} />
            </div>
          </div>
        </div>
        <div className="card">
          <h2>Billing address</h2>
          <label className="chk">
            <input type="checkbox" checked={sameBill} onChange={(e) => setSameBill(e.target.checked)} /> Same as shipping
          </label>
          {sameBill ? null : (
            <div className="stack" style={{ marginTop: 14 }}>
              <Field id="co-b1" label="Street address" name="b_line1" autoComplete="billing address-line1" />
              <div className="grid3">
                <Field id="co-bcity" label="City" name="b_city" autoComplete="billing address-level2" />
                <Field id="co-bstate" label="State" name="b_state" autoComplete="billing address-level1" />
                <Field id="co-bzip" label="ZIP" name="b_zip" autoComplete="billing postal-code" inputMode="numeric" />
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h2>Shipping method</h2>
          {CATALOG.shipping.map((m) => {
            const free = m.freeOver && sub >= m.freeOver * 100;
            return (
              <label key={m.id} className="radio-card">
                <input type="radio" name="ship" value={m.id} checked={shipMethod === m.id} onChange={() => setShipMethod(m.id)} />
                <div>
                  <b>{m.name}</b>
                  <br />
                  <span className="small muted">{m.eta}</span>
                </div>
                <span className="rp">{free ? "FREE" : money(m.price * 100)}</span>
              </label>
            );
          })}
        </div>
        <div className="card">
          <h2>Payment</h2>
          {paymentsReady ? (
            <p className="muted">
              <Icon name="lock" size={16} /> You&apos;ll pay on Stripe&apos;s secure checkout page next. We never see or store your card number.
            </p>
          ) : (
            <div className="test-note">
              <Icon name="lock" size={16} /> Online payment isn&apos;t switched on yet, so orders can&apos;t be placed on this preview.
            </div>
          )}
        </div>
      </div>
      <div className="sticky-side">
        <div className="card">
          <h2>Order summary</h2>
          {priced.map(({ it, price }) => (
            <div key={it.uid} className="mini-item">
              <span className="mi-art">
                <ItemSticker item={it} />
              </span>
              <div>
                <b>{getProduct(it.productId).name}</b>
                <span>
                  {fmtQty(it.qty)} · {dimLabel(it)} · {getMaterial(it.material).name}
                </span>
              </div>
              <span className="mp num">{money(price.totalCents)}</span>
            </div>
          ))}
          <div className="sumlines" style={{ marginTop: 16 }}>
            <div>
              <span>Subtotal</span>
              <span className="num">{money(t.subtotalCents)}</span>
            </div>
            <div>
              <span>Shipping ({getShipping(shipMethod).name})</span>
              <span className="num">{t.shippingCents ? money(t.shippingCents) : "FREE"}</span>
            </div>
            <div>
              <span>Estimated tax</span>
              <span className="num">{money(t.taxCents)}</span>
            </div>
            <div className="tot">
              <span>Total</span>
              <span className="num">{money(t.totalCents)}</span>
            </div>
          </div>
        </div>
        {error ? (
          <div className="form-err" role="alert" style={{ marginTop: 14 }}>
            {error}
          </div>
        ) : null}
        <button className="btn btn-red btn-lg btn-block" style={{ marginTop: 14 }} type="submit" disabled={!paymentsReady || pending}>
          <Icon name="lock" size={18} /> {pending ? "Opening secure checkout…" : "Continue to payment"}
        </button>
        <p className="small muted" style={{ marginTop: 12 }}>
          Nothing prints until you approve your proof.
        </p>
      </div>
    </form>
  );
}
