import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { LogoMark } from "@/components/site/Logo";
import { StickerPreview } from "@/components/sticker/StickerPreview";
import { Icon } from "@/components/ui/Icon";
import type { ArtKey, MaterialId, ShapeId } from "@/lib/catalog";
import { CATALOG } from "@/lib/catalog";
import { newConfig } from "@/lib/config";
import { FAQ, GALLERY, REVIEWS, STEPS, TICKER, WHY } from "@/lib/content";
import { fmtQty, money } from "@/lib/format";
import { calculatePrice, PRICING } from "@/lib/pricing";

const HERO: [ArtKey, ShapeId, MaterialId, number, number, React.CSSProperties, string, string][] = [
  ["peak", "circle", "holo", 2, 2, { left: "2%", top: "4%", width: "36%" }, "10deg", "0s"],
  ["flame", "oval", "gloss", 3, 2.1, { left: "62%", top: "4%", width: "34%" }, "14deg", "-2s"],
  ["bolt", "diecut", "gloss", 3, 3, { left: "24%", top: "20%", width: "52%" }, "-8deg", "-4s"],
  ["star", "diecut", "matte", 3, 3, { left: "0%", top: "60%", width: "36%" }, "-14deg", "-1s"],
  ["sendit", "rect", "gloss", 4, 2.75, { left: "42%", top: "64%", width: "56%" }, "6deg", "-3s"],
];

const JOURNEY = ["Choose", "Size", "Quantity", "Upload", "Price", "Checkout", "Proof", "Approve", "Production", "Shipping", "Delivered"];

export default function HomePage() {
  const bulkTiers = [500, 1000, 5000, 10000].map((qty) => ({ qty, price: calculatePrice({ ...newConfig("die-cut"), qty }) }));
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">From the wrap shop · Boise, Idaho</span>
            <h1 className="hero-h">
              Custom stickers.<span>Made easy.</span>
            </h1>
            <p className="lede">Upload your artwork, choose your size and quantity, approve your proof, and we&apos;ll handle the rest.</p>
            <div className="cta-row">
              <Link className="btn btn-red btn-lg" href="/stickers">
                Order Stickers <Icon name="arrow" size={18} />
              </Link>
              <Link className="btn btn-ghost-inv btn-lg" href="/business#quote">
                Get a Quote
              </Link>
            </div>
            <ul className="hero-proof">
              <li>
                <Icon name="check" size={15} />
                Free digital proof
              </li>
              <li>
                <Icon name="check" size={15} />
                Ships in 3 days
              </li>
              <li>
                <Icon name="check" size={15} />
                From {money(PRICING.minOrder * 100)}
              </li>
            </ul>
          </div>
          <div className="hero-art" aria-hidden="true">
            {HERO.map(([art, shape, material, w, h, pos, r, delay], i) => (
              <div key={i} className="hs" style={{ ...pos, ["--r" as string]: r, animationDelay: delay }}>
                <StickerPreview art={art} shape={shape} material={material} w={w} h={h} label="Example sticker" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="ticker" aria-hidden="true">
        <div className="ticker-in">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      <section className="sec" id="how">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">How it works</span>
              <h2 className="h2">
                Four steps.
                <br />
                Zero guesswork.
              </h2>
            </div>
            <p className="lede">You never need to know printing lingo. Pick what you like, upload your art, and approve exactly what we&apos;ll print.</p>
          </div>
          <div className="steps4">
            {STEPS.map(([t, d], i) => (
              <div key={t} className="step4">
                <span className="n">0{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <div className="journey">
            {JOURNEY.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-alt" id="products">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Popular stickers</span>
              <h2 className="h2">Pick a sticker</h2>
            </div>
            <Link className="btn btn-line" href="/stickers">
              See all stickers <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="pgrid">
            {CATALOG.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="why">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Why Sticker Status Direct</span>
              <h2 className="h2">
                Built like
                <br />
                vehicle graphics.
              </h2>
            </div>
          </div>
          <div className="why">
            {WHY.map(([i, t, d]) => (
              <div key={t}>
                <Icon name={i} size={28} />
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <div className="made-by">
            <LogoMark bg="#fff" fg="#0D0B0B" />
            <div>
              <b>Made by Sticker Status</b>
              <p>
                We wrap cars, tint windows and install PPF in Boise every day. Vinyl is our thing. Sticker Status Direct brings that same shop to
                your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-dark" id="gallery">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Sticker gallery</span>
              <h2 className="h2">Fresh off the press</h2>
            </div>
            <p className="lede">Sample designs shown. Real customer work will live here.</p>
          </div>
          <div className="gal">
            {GALLERY.map(([a, s, m, l], i) => (
              <figure key={i}>
                <StickerPreview art={a} shape={s} material={m} w={s === "rect" ? 4 : 3} h={s === "rect" ? 2.75 : s === "oval" ? 2.1 : 3} label={l} />
                <figcaption>{l}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="reviews">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Reviews</span>
              <h2 className="h2">What customers say</h2>
            </div>
            <span className="ph">Placeholder reviews · replace with real ones</span>
          </div>
          <div className="revs">
            {REVIEWS.map(([t, n, r]) => (
              <figure key={t} className="rev" style={{ margin: 0 }}>
                <span className="stars" aria-label="5 out of 5">
                  ★★★★★
                </span>
                <blockquote>“{t}”</blockquote>
                <footer>
                  <span>
                    {n} · {r}
                  </span>
                  <span className="ph">Sample</span>
                </footer>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }} id="bulk">
        <div className="wrap">
          <div className="bulk">
            <div>
              <span className="eyebrow" style={{ color: "#ff5a6e" }}>
                Business &amp; bulk orders
              </span>
              <h2 className="h2">Stickers for the whole brand.</h2>
              <p className="lede">Packaging seals, merch, fleet decals, event swag. Volume pricing, multiple designs per order, and one point of contact.</p>
              <div className="cta-row">
                <Link className="btn btn-red btn-lg" href="/business#quote">
                  Get a bulk quote
                </Link>
                <Link className="btn btn-ghost-inv btn-lg" href="/business">
                  Business pricing
                </Link>
              </div>
            </div>
            <div className="bulk-tiers">
              {bulkTiers.map(({ qty, price }) => (
                <div key={qty}>
                  <span>{fmtQty(qty)} × 3″ die cut</span>
                  <span>
                    <b>{money(price.perCents)}</b> <span className="save">/ea · save {price.savePct}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-alt" id="faq">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">FAQ</span>
              <h2 className="h2">Questions, answered</h2>
            </div>
          </div>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </section>

      <section className="final-cta">
        <div className="wrap">
          <h2>
            Put your
            <br />
            logo on it.
          </h2>
          <p>Start with 50 stickers or 10,000. You approve a proof before we print.</p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <Link className="btn btn-ink btn-lg" href="/stickers">
              Order Stickers <Icon name="arrow" size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
