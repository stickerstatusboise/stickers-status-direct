import type { ArtFile } from "@/components/cart/cart-store";
import { Icon } from "@/components/ui/Icon";
import { printQuality, RASTER_TYPES, type ArtFit, type QualityLevel } from "@/lib/artwork";
import { CATALOG, type ShapeId } from "@/lib/catalog";
import { inch } from "@/lib/config";
import { money } from "@/lib/format";

export const QUALITY_LABEL: Record<QualityLevel, string> = {
  good: "Looks sharp",
  ok: "May look soft up close",
  low: "May print blurry",
};

/** Sharpness rating for a file, or null when we can't check it in the browser (vector and design files). */
export function fileQuality(f: ArtFile, sticker: { w: number; h: number }, shape: ShapeId, fit?: ArtFit) {
  if (!RASTER_TYPES.includes(f.type) || !f.width || !f.height) return null;
  return printQuality({ width: f.width, height: f.height }, sticker, shape, fit);
}

/** Small tag shown on each uploaded file. */
export function QualityBadge({
  file,
  sticker,
  shape,
  fit,
  enhance,
}: {
  file: ArtFile;
  sticker: { w: number; h: number };
  shape: ShapeId;
  fit?: ArtFit;
  enhance?: boolean;
}) {
  const q = fileQuality(file, sticker, shape, fit);
  if (!q) return <span className="qbadge">We&apos;ll check this file</span>;
  if (enhance && q.level !== "good")
    return (
      <span className="qbadge" data-level="good">
        Will be enhanced
      </span>
    );
  return (
    <span className="qbadge" data-level={q.level}>
      {QUALITY_LABEL[q.level]}
    </span>
  );
}

/** Explains the rating for the artwork shown on the preview. Silent when it looks sharp. */
export function QualityNote({
  file,
  sticker,
  shape,
  fit,
  enhance,
}: {
  file: ArtFile | undefined;
  sticker: { w: number; h: number };
  shape: ShapeId;
  fit?: ArtFit;
  /** Customer added image enhancement. */
  enhance?: boolean;
}) {
  if (!file) return null;
  const q = fileQuality(file, sticker, shape, fit);
  if (!q || q.level === "good") return null;
  if (enhance)
    return (
      <div className="q-note" data-level="fixed" role="status">
        <Icon name="check" size={18} />
        <div>
          <b>Image enhancement added</b>
          <span>We&apos;ll enlarge and sharpen {file.name} before printing. You&apos;ll see the result on your proof.</span>
        </div>
      </div>
    );
  const size = `${inch(sticker.w)} × ${inch(sticker.h)}`;
  return (
    <div className="q-note" data-level={q.level} role="status">
      <Icon name={q.level === "low" ? "eye" : "bell"} size={18} />
      <div>
        <b>{q.level === "low" ? "This image may print blurry" : "This image may look a little soft up close"}</b>
        <span>
          {file.name} is {file.width} × {file.height} pixels, which is {q.level === "low" ? "small" : "on the small side"} for a {size} sticker.
          For a sharper print, upload a larger or original version of your file, or add image enhancement (+{money(CATALOG.enhanceFee * 100)}) in
          the Artwork section and we&apos;ll sharpen it for you. We check every file before printing and will let you know if it needs work.
        </span>
      </div>
    </div>
  );
}
