/**
 * Product catalog: everything a customer can choose.
 * Lifted from the approved prototype (docs/prototype.html, CATALOG).
 * Edit values here to change what the store offers; the pricing formula lives in pricing.ts.
 */

export type ShapeId = "diecut" | "circle" | "square" | "rect" | "oval";
export type MaterialId = "gloss" | "matte" | "clear" | "holo" | "reflective";
export type OptionId = "laminate" | "rush";
export type ShippingId = "standard" | "expedited" | "overnight";
export type ArtKey =
  | "bolt"
  | "peak"
  | "sendit"
  | "fuel"
  | "fuel-v1"
  | "mono"
  | "sun"
  | "flame"
  | "flame-v2"
  | "star";

export interface Shape {
  id: ShapeId;
  name: string;
  hint: string;
}
export interface Material {
  id: MaterialId;
  name: string;
  hint: string;
  /** Price multiplier vs. gloss. */
  mult: number;
}
export interface ExtraOption {
  id: OptionId;
  name: string;
  hint: string;
  /** Added as a percentage of the sticker price. */
  pct: number;
}
export interface Product {
  id: string;
  name: string;
  shape: ShapeId;
  material: MaterialId;
  art: ArtKey;
  tag?: string;
  blurb: string;
}
export interface ShippingMethod {
  id: ShippingId;
  name: string;
  eta: string;
  price: number;
  freeOver?: number;
}

export const CATALOG = {
  shapes: [
    { id: "diecut", name: "Custom Die Cut", hint: "Cut around your art" },
    { id: "circle", name: "Circle", hint: "Classic round" },
    { id: "square", name: "Square", hint: "Rounded corners" },
    { id: "rect", name: "Rectangle", hint: "Great for text" },
    { id: "oval", name: "Oval", hint: "Badge style" },
  ] as Shape[],
  sizes: [2, 3, 4, 5, 6],
  quantities: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
  minQty: 50,
  materials: [
    { id: "gloss", name: "Gloss", hint: "Shiny and vivid", mult: 1.0 },
    { id: "matte", name: "Matte", hint: "Smooth, no glare", mult: 1.0 },
    { id: "clear", name: "Clear", hint: "See-through background", mult: 1.15 },
    { id: "holo", name: "Holographic", hint: "Rainbow in the light", mult: 1.45 },
    { id: "reflective", name: "Reflective", hint: "Glows in headlights", mult: 1.6 },
  ] as Material[],
  options: [
    { id: "laminate", name: "Scratch-guard laminate", hint: "Extra armor for cars, bottles and toolboxes", pct: 0.1 },
    { id: "rush", name: "Rush production", hint: "Prints the next business day after you approve", pct: 0.3 },
  ] as ExtraOption[],
  designFee: 35,
  /** Flat fee per sticker design to enlarge and sharpen a low-resolution image before printing (staff run it through Topaz Gigapixel). */
  enhanceFee: 5,
  products: [
    { id: "die-cut", name: "Die Cut Stickers", shape: "diecut", material: "gloss", art: "bolt", tag: "Most popular", blurb: "Cut to the exact outline of your design." },
    { id: "circle", name: "Circle Stickers", shape: "circle", material: "gloss", art: "peak", blurb: "Clean, round and perfect for logos." },
    { id: "square", name: "Square Stickers", shape: "square", material: "matte", art: "sun", blurb: "Soft rounded corners, lots of room." },
    { id: "rectangle", name: "Rectangle Stickers", shape: "rect", material: "gloss", art: "sendit", blurb: "Bumper stickers, labels and wordmarks." },
    { id: "oval", name: "Oval Stickers", shape: "oval", material: "gloss", art: "flame", blurb: "Badge-style for brands and clubs." },
    { id: "clear", name: "Clear Stickers", shape: "diecut", material: "clear", art: "mono", blurb: "No background. Your art, floating." },
    { id: "holographic", name: "Holographic Stickers", shape: "diecut", material: "holo", art: "star", tag: "Fan favorite", blurb: "Rainbow shift that turns heads." },
    { id: "reflective", name: "Reflective Stickers", shape: "diecut", material: "reflective", art: "peak", blurb: "Lights up at night. Great for bikes and trucks." },
  ] as Product[],
  shipping: [
    { id: "standard", name: "Standard", eta: "3–5 business days after printing", price: 6.95, freeOver: 75 },
    { id: "expedited", name: "Expedited", eta: "2 business days after printing", price: 14.95 },
    { id: "overnight", name: "Overnight", eta: "Next business day after printing", price: 34.95 },
  ] as ShippingMethod[],
  /** Placeholder (Idaho state rate). */
  taxRate: 0.06,
  uploadTypes: ["ai", "eps", "svg", "pdf", "psd", "png", "jpg", "jpeg"],
};

const byId = <T extends { id: string }>(arr: T[], id: string | undefined): T =>
  arr.find((x) => x.id === id) ?? arr[0];

export const getProduct = (id: string | undefined) => byId(CATALOG.products, id);
export const findProduct = (id: string) => CATALOG.products.find((p) => p.id === id);
export const getShape = (id: string | undefined) => byId(CATALOG.shapes, id);
export const getMaterial = (id: string | undefined) => byId(CATALOG.materials, id);
export const getShipping = (id: string | undefined) => byId(CATALOG.shipping, id);
