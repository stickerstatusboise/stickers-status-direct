/**
 * Live sticker preview: shape, material sheen and die-cut outline.
 * Port of the prototype's stickerSVG(). Returns SVG markup so it renders the same on the server and in the browser.
 */
import { ART } from "./art";
import { artInset, canAdjustArt, clampFit, type ArtFit } from "./artwork";
import type { ArtKey, MaterialId, ShapeId } from "./catalog";
import { clamp } from "./config";
import { esc } from "./format";

export interface StickerSvgOptions {
  /** Unique, CSS-safe id prefix for gradients/filters. */
  id: string;
  art?: ArtKey;
  /** Customer image (data: or blob: URL). Takes priority over art. */
  url?: string | null;
  /** Customer's resize/move of an uploaded image. Ignored for die cut. */
  fit?: ArtFit;
  shape?: ShapeId;
  material?: MaterialId;
  w?: number;
  h?: number;
  label?: string;
}

export function stickerSvg(o: StickerSvgOptions): string {
  const id = o.id.replace(/[^a-zA-Z0-9_-]/g, "");
  const shape = o.shape || "diecut";
  const material = o.material || "gloss";
  const w = o.w || 3;
  let h = o.h || 3;
  if (shape === "circle" || shape === "square" || shape === "diecut") h = w;
  const r = clamp(h / w, 0.4, 2.5);
  let SW = 200;
  let SH = Math.round(200 * r);
  if (SH > 200) {
    SW = Math.round(200 / r);
    SH = 200;
  }
  const pad = 18;
  const vw = SW + pad * 2;
  const vh = SH + pad * 2;
  const A = o.art ? ART[o.art] : null;
  const clear = material === "clear";
  const bg = clear ? "rgba(255,255,255,.12)" : o.url ? "#fff" : A ? A.bg : "#fff";
  const inset = artInset(shape);

  let content = "";
  if (o.url) {
    const f = o.fit && canAdjustArt(shape) ? clampFit(o.fit) : { scale: 1, x: 0, y: 0 };
    const iw = SW * inset * f.scale;
    const ih = SH * inset * f.scale;
    const ix = pad + (SW - iw) / 2 + f.x * SW;
    const iy = pad + (SH - ih) / 2 + f.y * SH;
    content = `<image href="${esc(o.url)}" x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/>`;
  } else if (A) {
    const s = (inset * Math.min(SW, SH)) / 200;
    const tx = pad + (SW - 200 * s) / 2;
    const ty = pad + (SH - 200 * s) / 2;
    content = `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(3)})">${A.svg}</g>`;
  }

  const x = pad;
  const y = pad;
  let shapeEl = "";
  if (shape === "circle") shapeEl = `<circle cx="${x + SW / 2}" cy="${y + SH / 2}" r="${SW / 2}"/>`;
  else if (shape === "oval") shapeEl = `<ellipse cx="${x + SW / 2}" cy="${y + SH / 2}" rx="${SW / 2}" ry="${SH / 2}"/>`;
  else if (shape === "square" || shape === "rect")
    shapeEl = `<rect x="${x}" y="${y}" width="${SW}" height="${SH}" rx="${(Math.min(SW, SH) * 0.09).toFixed(1)}"/>`;

  const sheen = ({ holo: `url(#${id}h)`, reflective: `url(#${id}r)`, gloss: `url(#${id}g)` } as Record<string, string>)[material];
  const border = clear ? "rgba(255,255,255,.38)" : "#fff";
  const defs = `<defs>
    <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7ad9"/><stop offset=".25" stop-color="#7af0ff"/><stop offset=".5" stop-color="#fff58a"/><stop offset=".75" stop-color="#b58cff"/><stop offset="1" stop-color="#7affc4"/></linearGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".32" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="${id}f" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="7" result="d"/><feFlood flood-color="${border}"/><feComposite in2="d" operator="in" result="b"/><feGaussianBlur in="d" stdDeviation="4" result="bl"/><feOffset in="bl" dy="5" result="o"/><feFlood flood-color="#000" flood-opacity=".35"/><feComposite in2="o" operator="in" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${id}s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".35"/></filter>
    <filter id="${id}m" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="7" result="d"/><feFlood flood-color="#fff"/><feComposite in2="d" operator="in"/></filter>
    <mask id="${id}k" maskUnits="userSpaceOnUse" x="0" y="0" width="${vw}" height="${vh}">${shape === "diecut" ? `<g filter="url(#${id}m)">${content}</g>` : `<g fill="#fff">${shapeEl}</g>`}</mask>
    ${shape !== "diecut" ? `<clipPath id="${id}c">${shapeEl}</clipPath>` : ""}
  </defs>`;

  const body =
    shape === "diecut"
      ? `<g filter="url(#${id}f)">${content}</g>`
      : `<g filter="url(#${id}s)" fill="${bg}">${shapeEl}</g><g clip-path="url(#${id}c)">${content}</g><g fill="none" stroke="${border}" stroke-width="${clear ? 1.5 : 5}">${shapeEl}</g>`;
  const over = sheen
    ? `<rect x="0" y="0" width="${vw}" height="${vh}" fill="${sheen}" mask="url(#${id}k)" ${material === "holo" ? 'style="mix-blend-mode:screen" opacity=".55"' : ""}/>`
    : "";

  return `<svg class="stk" viewBox="0 0 ${vw} ${vh}" role="img" aria-label="${esc(o.label || "Sticker preview")}">${defs}${body}${over}</svg>`;
}
