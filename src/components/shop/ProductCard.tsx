import Link from "next/link";
import { StickerPreview } from "@/components/sticker/StickerPreview";
import type { Product } from "@/lib/catalog";
import { dims, newConfig } from "@/lib/config";
import { money } from "@/lib/format";
import { calculatePrice } from "@/lib/pricing";

export function fromPriceCents(productId: string) {
  return calculatePrice({ ...newConfig(productId), qty: 50 }).totalCents;
}

export function ProductCard({ product: p }: { product: Product }) {
  const d = dims(newConfig(p.id));
  const paint = p.material === "clear" || p.material === "reflective";
  return (
    <article>
      <Link className="pcard-btn" href={`/stickers/${p.id}`} aria-label={`Customize ${p.name}`}>
        <div className={`pcard-art ${paint ? "paint" : ""}`}>
          {p.tag ? <span className="tag">{p.tag}</span> : null}
          <StickerPreview art={p.art} shape={p.shape} material={p.material} w={d.w} h={d.h} label={p.name} />
        </div>
        <div className="pcard-body">
          <h3>{p.name}</h3>
          <p className="blurb">{p.blurb}</p>
          <p className="from">
            From <strong>{money(fromPriceCents(p.id))}</strong> for 50
          </p>
        </div>
      </Link>
    </article>
  );
}
