import { CATALOG, getProduct, type MaterialId, type OptionId, type ShapeId } from "./catalog";

/** A customer's sticker choices. Stored in the cart and (later) on order items. */
export interface StickerConfig {
  productId: string;
  shape: ShapeId;
  /** Preset size in inches (longest side / width), or "custom". */
  size: number | "custom";
  /** Custom width and height in inches, used when size is "custom". */
  cw: number;
  ch: number;
  qty: number;
  material: MaterialId;
  options: Record<OptionId, boolean>;
  designHelp: boolean;
  /** Customer asked us to enlarge and sharpen their image before printing (flat fee). */
  enhance: boolean;
  designNotes: string;
}

export function newConfig(productId: string): StickerConfig {
  const p = getProduct(productId);
  return {
    productId: p.id,
    shape: p.shape,
    size: 3,
    cw: 3,
    ch: 2,
    qty: 100,
    material: p.material,
    options: { laminate: false, rush: false },
    designHelp: false,
    enhance: false,
    designNotes: "",
  };
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const q4 = (v: number) => Math.round(v * 4) / 4;

/** Finished sticker size in inches. Rectangles are 3:2 and ovals 10:7 of the chosen width. */
export function dims(c: Pick<StickerConfig, "size" | "cw" | "ch" | "shape">): { w: number; h: number } {
  if (c.size === "custom") {
    const w = clamp(+c.cw || 1, 0.5, 24);
    let h = clamp(+c.ch || 1, 0.5, 24);
    if (c.shape === "circle" || c.shape === "square") h = w;
    return { w, h };
  }
  const s = +c.size || 3;
  if (c.shape === "rect") return { w: s, h: q4((s * 2) / 3) };
  if (c.shape === "oval") return { w: s, h: q4(s * 0.7) };
  return { w: s, h: s };
}

export const inch = (v: number) => (Math.round(v * 100) / 100).toString() + "″";
export const dimLabel = (c: Parameters<typeof dims>[0]) => {
  const d = dims(c);
  return `${inch(d.w)} × ${inch(d.h)}`;
};

/** Whole-number quantity, never below the minimum. */
export const normalizeQty = (q: unknown) => Math.max(CATALOG.minQty, Math.round(Number(q) || 0));
