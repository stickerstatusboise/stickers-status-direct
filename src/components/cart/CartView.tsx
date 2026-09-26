"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { CATALOG, getProduct } from "@/lib/catalog";
import { money } from "@/lib/format";
import { calculatePrice, cartTotals } from "@/lib/pricing";
import { cart, useCart } from "./cart-store";
import { ItemSpecs } from "./ItemSpecs";
import { ItemSticker } from "./ItemSticker";

export function CartView() {
  const items = useCart();
  if (items === null) return <div style={{ minHeight: 320 }} />;
  if (!items.length)
    return (
      <>
        <div className="card empty">
          <h2>Your cart is empty</h2>
          <p className="muted">Pick a sticker style to get started.</p>
          <Link className="btn btn-red btn-lg" href="/stickers">
            Order Stickers
          </Link>
        </div>
        <div style={{ height: 80 }} />
      </>
    );

  const priced = items.map((it) => ({ it, price: calculatePrice(it) }));
  const t = cartTotals(
    priced.reduce((s, x) => s + x.price.totalCents, 0),
    CATALOG.shipping[0],
  );

  return (
    <div className="two-col">
      <div className="card">
        {priced.map(({ it, price }) => (
          <div key={it.uid} className="citem">
            <div className="art">
              <ItemSticker item={it} />
            </div>
            <div>
              <h3>{getProduct(it.productId).name}</h3>
              <ItemSpecs item={it} />
            </div>
            <div className="pr">
              <b className="num">{money(price.totalCents)}</b>
              <span className="small muted num">{money(price.totalCents / price.qty)} / ea</span>
              <div className="row" style={{ gap: 6 }}>
                <Link className="btn btn-line btn-sm" href={`/stickers/${it.productId}?edit=${it.uid}`}>
                  Edit
                </Link>
                <button className="btn btn-line btn-sm" onClick={() => cart.remove(it.uid)}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky-side">
        <div className="card">
          <h2>Summary</h2>
          <div className="sumlines">
            <div>
              <span>Subtotal</span>
              <span className="num">{money(t.subtotalCents)}</span>
            </div>
            <div>
              <span>Shipping</span>
              <span className="num">{t.shippingCents ? "from " + money(t.shippingCents) : "FREE"}</span>
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
          <Link className="btn btn-red btn-lg btn-block" style={{ marginTop: 18 }} href="/checkout">
            Checkout <Icon name="arrow" size={18} />
          </Link>
          <Link className="btn btn-line btn-block" style={{ marginTop: 10 }} href="/stickers">
            Add another sticker
          </Link>
          <p className="small muted" style={{ marginTop: 14 }}>
            <Icon name="shield" size={15} /> You approve a digital proof before anything prints.
          </p>
        </div>
      </div>
    </div>
  );
}
