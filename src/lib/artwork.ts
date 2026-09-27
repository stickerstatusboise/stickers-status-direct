/**
 * Customer artwork placement (resize and move on the preview) and the print-sharpness check.
 * Pure functions, shared by the configurator, cart and (later) the proof/admin screens.
 */
import type { ShapeId } from "./catalog";
import { clamp } from "./config";

/** Where the customer placed their artwork: scale 1 = fit inside the sticker; x/y = offset as a fraction of sticker width/height. */
export interface ArtFit {
  scale: number;
  x: number;
  y: number;
}

export const DEFAULT_FIT: ArtFit = { scale: 1, x: 0, y: 0 };
export const FIT_LIMITS = { minScale: 0.5, maxScale: 2.5, maxOffset: 0.5 };

export const clampFit = (f: ArtFit): ArtFit => ({
  scale: clamp(Number(f.scale) || 1, FIT_LIMITS.minScale, FIT_LIMITS.maxScale),
  x: clamp(Number(f.x) || 0, -FIT_LIMITS.maxOffset, FIT_LIMITS.maxOffset),
  y: clamp(Number(f.y) || 0, -FIT_LIMITS.maxOffset, FIT_LIMITS.maxOffset),
});

export const isDefaultFit = (f: ArtFit | undefined) => !f || (f.scale === 1 && f.x === 0 && f.y === 0);

/**
 * Die cut stickers are cut around the artwork, so it always fills the sticker and can't be moved or resized.
 * Other shapes can.
 */
export const canAdjustArt = (shape: ShapeId) => shape !== "diecut";

/** Share of the sticker the artwork fills at scale 1, leaving a margin inside round and square shapes. */
export const artInset = (shape: ShapeId) => (shape === "diecut" ? 1 : shape === "circle" || shape === "oval" ? 0.7 : 0.8);

/**
 * Pixels per printed inch that count as sharp / acceptable. Below OK_PPI the print may look blurry.
 * Owner can tune these.
 */
export const QUALITY = { GOOD_PPI: 300, OK_PPI: 150 };

export type QualityLevel = "good" | "ok" | "low";

/** Image formats whose pixel size we can read in the browser. Vector and design files are checked by staff. */
export const RASTER_TYPES = ["png", "jpg", "jpeg"];

/**
 * How sharp a photo-type image will print at this sticker size and placement.
 * The image is fitted inside the artwork area (keeping its proportions), then scaled by the customer's fit.
 */
export function printQuality(
  px: { width: number; height: number },
  sticker: { w: number; h: number },
  shape: ShapeId,
  fit: ArtFit = DEFAULT_FIT,
): { level: QualityLevel; ppi: number } {
  const scale = canAdjustArt(shape) ? clampFit(fit).scale : 1;
  const inset = artInset(shape);
  const boxW = sticker.w * inset * scale;
  const boxH = sticker.h * inset * scale;
  const aspect = px.width / px.height;
  const printedW = Math.min(boxW, boxH * aspect);
  const ppi = Math.round(px.width / printedW);
  const level: QualityLevel = ppi >= QUALITY.GOOD_PPI ? "good" : ppi >= QUALITY.OK_PPI ? "ok" : "low";
  return { level, ppi };
}
