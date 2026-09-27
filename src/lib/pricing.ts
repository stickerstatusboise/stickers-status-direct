/**
 * PLACEHOLDER PRICING. Replace calculatePrice() with the real formula.
 *
 * Rules for whoever replaces it:
 * - Keep it a pure function of the sticker config (no network, no dates, no randomness).
 * - Return amounts in integer cents.
 * - The server recalculates every price at checkout; the browser's number is only a preview.
 * - Update src/lib/pricing.test.ts with a few known prices from the new formula.
 */
import { CATALOG, getMaterial } from "./catalog";
import { dims, normalizeQty, type StickerConfig } from "./config";

export const PRICING_VERSION = "placeholder-v1";

export const PRICING = {
  /** Smallest sticker charge per line item, in dollars. */
  minOrder: 25,
  /** $ per sticker before size. */
  baseUnit: 0.12,
  /** $ per square inch per sticker. */
  perSqIn: 0.055,
  /** How steeply price drops with quantity. */
  volumeExponent: 0.32,
  baseQty: 50,
  shapeMult: { diecut: 1.08, circle: 1, square: 1, rect: 1, oval: 1 } as Record<string, number>,
};

export interface PriceLine {
  label: string;
  cents: number;
}
export interface Price {
  totalCents: number;
  /** Price per sticker in cents, excluding flat fees like design help (may be fractional). */
  perCents: number;
  qty: number;
  lines: PriceLine[];
  /** Percent saved per sticker vs. the base quantity. */
  savePct: number;
}

type PriceInput = Pick<StickerConfig, "shape" | "size" | "cw" | "ch" | "qty" | "material" | "options" | "designHelp"> & {
  enhance?: boolean;
};

const toCents = (dollars: number) => Math.round(dollars * 100);

export function calculatePrice(cfg: PriceInput): Price {
  const { w, h } = dims(cfg);
  const qty = normalizeQty(cfg.qty);
  const mat = getMaterial(cfg.material);
  const unitBase = (PRICING.baseUnit + w * h * PRICING.perSqIn) * mat.mult * (PRICING.shapeMult[cfg.shape] || 1);
  const volume = Math.pow(qty / PRICING.baseQty, -PRICING.volumeExponent);
  const stickers = Math.max(unitBase * volume * qty, PRICING.minOrder);

  const lines: { label: string; amount: number }[] = [{ label: `${qty.toLocaleString("en-US")} stickers`, amount: stickers }];
  let extras = 0;
  for (const o of CATALOG.options) {
    if (cfg.options?.[o.id]) {
      const a = stickers * o.pct;
      extras += a;
      lines.push({ label: o.name, amount: a });
    }
  }
  const design = cfg.designHelp ? CATALOG.designFee : 0;
  if (design) lines.push({ label: "Design help", amount: design });
  const enhance = cfg.enhance ? CATALOG.enhanceFee : 0;
  if (enhance) lines.push({ label: "Image enhancement", amount: enhance });

  const per = (stickers + extras) / qty;
  const listUnit = unitBase * (1 + extras / stickers);
  const savePct = Math.max(0, Math.round((1 - per / listUnit) * 100));

  return {
    totalCents: toCents(stickers + extras + design + enhance),
    perCents: per * 100,
    qty,
    lines: lines.map((l) => ({ label: l.label, cents: toCents(l.amount) })),
    savePct,
  };
}

/** The price of one extra option on its own (shown next to the checkbox). */
export function optionPriceCents(cfg: PriceInput, pct: number): number {
  const base = calculatePrice({ ...cfg, options: { laminate: false, rush: false }, designHelp: false, enhance: false });
  return Math.round(base.totalCents * pct);
}

export interface Totals {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

/** Cart totals: shipping (free standard over the threshold) and placeholder tax on the subtotal. */
export function cartTotals(subtotalCents: number, method: { price: number; freeOver?: number }): Totals {
  const shippingCents = method.freeOver && subtotalCents >= method.freeOver * 100 ? 0 : toCents(method.price);
  const taxCents = Math.round(subtotalCents * CATALOG.taxRate);
  return { subtotalCents, shippingCents, taxCents, totalCents: subtotalCents + shippingCents + taxCents };
}
