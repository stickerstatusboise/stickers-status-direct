"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CATALOG, getMaterial, getProduct, getShipping, type ShippingId } from "@/lib/catalog";
import { dimLabel } from "@/lib/config";
import { fmtQty, money } from "@/lib/format";
import { calculatePrice, cartTotals } from "@/lib/pricing";
import { useCart } from "./cart-store";
import { ItemSticker } from "./ItemSticker";

function Field({ id, label, name, type = "text", required = true, autoComplete, inputMode }: {
  id: string;
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} required={required} autoComplete={autoComplete} inputMode={inputMode} />
    </div>
  );
}

/**
 * Checkout form. Payment is not connected yet: Stripe Checkout arrives in step 5,
 * and the server will reprice the cart then. Until then "Place order" stays disabled.
 */
export function CheckoutView() {
  const items = useCart();
  const [shipMethod, setShipMethod] = useState<ShippingId>("standard");
  const [sameBill, setSameBill] = useState(true);

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

  return (
    <form className="two-col" noValidate onSubmit={(e) => e.preventDefault()}>
      <div>
        <div className="card">
          <h2>Contact</h2>
          <div className="stack">
            <Field id="co-name" label="Full name" name="name" autoComplete="name" />
            <div className="grid2">
              <Field id="co-email" label="Email" name="email" type="email" autoComplete="email" />
              <Field id="co-phone" label="Phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <p className="small muted">We send your proof and tracking updates here. An account is created so you can approve proofs and track your order.</p>
          </div>
        </div>
        <div className="card">
          <h2>Shipping address</h2>
          <div className="stack">
            <Field id="co-a1" label="Street address" name="line1" autoComplete="address-line1" />
            <Field id="co-a2" label="Apt, suite (optional)" name="line2" required={false} autoComplete="address-line2" />
            <div className="grid3">
              <Field id="co-city" label="City" name="city" autoComplete="address-level2" />
              <Field id="co-state" label="State" name="state" autoComplete="address-level1" />
              <Field id="co-zip" label="ZIP" name="zip" autoComplete="postal-code" inputMode="numeric" />
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
          <div className="test-note">
            <Icon name="lock" size={16} /> Online payment isn&apos;t switched on yet, so orders can&apos;t be placed on this preview. Secure card payment
            through Stripe is coming next.
          </div>
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
        <button className="btn btn-red btn-lg btn-block" style={{ marginTop: 14 }} type="submit" disabled>
          <Icon name="lock" size={18} /> Place order
        </button>
        <p className="small muted" style={{ marginTop: 12 }}>
          Nothing prints until you approve your proof.
        </p>
      </div>
    </form>
  );
}
