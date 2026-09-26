import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { newConfig, type StickerConfig } from "./config";
import { calculatePrice, cartTotals, optionPriceCents } from "./pricing";

const cfg = (over: Partial<StickerConfig> = {}): StickerConfig => ({ ...newConfig("die-cut"), ...over });

describe("calculatePrice (placeholder formula, matches the prototype)", () => {
  it.each([
    ["3in die cut x100 gloss", {}, 5321, 20],
    ["3in die cut x50", { qty: 50 }, 3321, 0],
    ["3in die cut x10,000", { qty: 10000 }, 121890, 82],
    ["2in circle x1,000", { qty: 1000, size: 2, shape: "circle" }, 13036, 62],
    ["3in oval x250", { shape: "oval", size: 3, qty: 250 }, 6722, 40],
    ["custom 10x8 rect x75", { size: "custom", cw: 10, ch: 8, shape: "rect", qty: 75 }, 29775, 12],
  ] as [string, Partial<StickerConfig>, number, number][])("%s", (_, over, total, save) => {
    const p = calculatePrice(cfg(over));
    expect(p.totalCents).toBe(total);
    expect(p.savePct).toBe(save);
  });

  it("itemizes extras and the design fee", () => {
    const p = calculatePrice(cfg({ material: "reflective", size: 5, qty: 500, options: { laminate: true, rush: true } }));
    expect(p.lines).toEqual([
      { label: "500 stickers", cents: 61824 },
      { label: "Scratch-guard laminate", cents: 6182 },
      { label: "Rush production", cents: 18547 },
    ]);
    expect(p.totalCents).toBe(86553);

    const d = calculatePrice(cfg({ material: "holo", size: 4, qty: 50, designHelp: true }));
    expect(d.lines.at(-1)).toEqual({ label: "Design help", cents: CATALOG.designFee * 100 });
    expect(d.totalCents).toBe(11330);
    // Per-sticker price excludes the design fee
    expect(d.perCents).toBeCloseTo(156.6, 6);
  });

  it("charges the minimum order for tiny jobs", () => {
    expect(calculatePrice(cfg({ size: 2, qty: 50, shape: "circle" })).totalCents).toBe(2500);
  });

  it("never goes below the minimum quantity", () => {
    const p = calculatePrice(cfg({ qty: 10 }));
    expect(p.qty).toBe(50);
    expect(p.totalCents).toBe(3321);
    expect(calculatePrice(cfg({ qty: Number.NaN })).qty).toBe(50);
  });

  it("clamps custom sizes to 0.5–24in and keeps circles round", () => {
    expect(calculatePrice(cfg({ size: "custom", cw: 30, ch: 0.1, shape: "circle" })).totalCents).toBe(254740);
  });

  it("gets cheaper per sticker as quantity grows", () => {
    const per = CATALOG.quantities.map((qty) => calculatePrice(cfg({ qty })).perCents);
    for (let i = 1; i < per.length; i++) expect(per[i]).toBeLessThan(per[i - 1]);
  });

  it("prices an option on the base sticker price", () => {
    expect(optionPriceCents(cfg(), 0.1)).toBe(532);
  });
});

describe("cartTotals", () => {
  const standard = CATALOG.shipping[0];
  it("ships standard free at $75 and adds 6% tax", () => {
    expect(cartTotals(7500, standard)).toEqual({ subtotalCents: 7500, shippingCents: 0, taxCents: 450, totalCents: 7950 });
    expect(cartTotals(5321, standard)).toEqual({ subtotalCents: 5321, shippingCents: 695, taxCents: 319, totalCents: 6335 });
  });
  it("always charges expedited", () => {
    expect(cartTotals(10000, CATALOG.shipping[1]).shippingCents).toBe(1495);
  });
});
