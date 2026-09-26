import type { Metadata } from "next";
import { QuoteForm } from "@/components/business/QuoteForm";
import { newConfig } from "@/lib/config";
import { fmtQty, money } from "@/lib/format";
import { calculatePrice } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Business & bulk sticker orders",
  description: "Volume pricing on custom stickers, multiple designs per order, brand color matching and a dedicated contact at the Sticker Status shop in Boise.",
  alternates: { canonical: "/business" },
};

const SIZES = [2, 3, 4];
const QTYS = [500, 1000, 2500, 5000, 10000];
const PERKS: [string, string][] = [
  ["Brand color matching", "Send your Pantone or hex values. We match on press and note it on your proof."],
  ["Multiple designs, one order", "Mix designs and sizes in one bulk order with one proof round."],
  ["Net terms", "Available for approved business accounts (future feature)."],
  ["Local pickup", "Boise customers can pick up at the Sticker Status shop."],
];

export default function BusinessPage() {
  return (
    <>
      <section className="hero" style={{ paddingBlock: 0 }}>
        <div className="wrap" style={{ paddingBlock: "64px 56px", position: "relative" }}>
          <span className="eyebrow">Business / Bulk orders</span>
          <h1 className="hero-h" style={{ fontSize: "clamp(52px,8vw,110px)" }}>
            Stickers at<span>fleet scale.</span>
          </h1>
          <p className="lede">Volume pricing, multiple designs, brand-color matching and a dedicated contact at the shop.</p>
        </div>
      </section>
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Bulk pricing</span>
              <h2 className="h3">Price per sticker</h2>
              <p className="lede">Gloss die cut, placeholder pricing. Other materials and shapes adjust from here.</p>
            </div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>Size</th>
                  {QTYS.map((q) => (
                    <th key={q}>{fmtQty(q)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIZES.map((s) => (
                  <tr key={s}>
                    <td>
                      <b>{s}″ die cut</b>
                    </td>
                    {QTYS.map((q) => (
                      <td key={q} className="num">
                        {money(calculatePrice({ ...newConfig("die-cut"), size: s, qty: q }).perCents)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="sec sec-alt" id="quote">
        <div className="wrap">
          <div className="two-col" style={{ paddingBottom: 0 }}>
            <QuoteForm />
            <div className="stack">
              {PERKS.map(([t, d]) => (
                <div key={t} className="card">
                  <h3>{t}</h3>
                  <p className="muted">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
