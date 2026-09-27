import { StickerPreview } from "@/components/sticker/StickerPreview";
import { getMaterial, getShape, type ArtKey, type MaterialId, type ShapeId } from "@/lib/catalog";
import { clamp } from "@/lib/config";
import { fmtDT, fmtQty } from "@/lib/format";

/** Size of the drawn sticker inside the preview's 200px box (matches stickerSvg). */
function drawnSize(w: number, h: number, shape: string) {
  let r = clamp(h / w, 0.4, 2.5);
  if (shape === "circle" || shape === "square" || shape === "diecut") r = 1;
  let SW = 200;
  let SH = Math.round(200 * r);
  if (SH > 200) {
    SW = Math.round(200 / r);
    SH = 200;
  }
  return { SW, SH };
}

/** Proof sheet: the proof on a grid with the cut line and dimensions, like a printed proof. */
export function ProofSheet({
  orderNumber,
  version,
  sentAt,
  art,
  item,
}: {
  orderNumber: string;
  version: number;
  sentAt: Date;
  art: ArtKey | null;
  item: { shape: string; material: string; widthIn: number; heightIn: number; qty: number };
}) {
  const { SW, SH } = drawnSize(item.widthIn, item.heightIn, item.shape);
  const vw = SW + 36;
  const vh = SH + 36;
  const px = (18 / vw) * 100;
  const py = (18 / vh) * 100;
  const rad = item.shape === "circle" || item.shape === "oval" ? "50%" : item.shape === "diecut" ? "18%" : "8%";
  return (
    <figure className="proof-sheet" style={{ margin: 0 }}>
      <div className="ps-head">
        <span>
          <b>PROOF v{version}</b> · {orderNumber}
        </span>
        <span>{fmtDT(sentAt)}</span>
      </div>
      <div className="ps-stage">
        <div className="ps-fig">
          <StickerPreview
            art={art ?? undefined}
            shape={item.shape as ShapeId}
            material={item.material as MaterialId}
            w={item.widthIn}
            h={item.heightIn}
            label={`Proof version ${version}`}
          />
          <span className="ps-cut" style={{ left: `${px}%`, right: `${px}%`, top: `${py}%`, bottom: `${py}%`, borderRadius: rad }} />
          <span className="ps-dw" style={{ left: `${px}%`, right: `${px}%` }}>
            <span>{item.widthIn.toFixed(2)} in</span>
          </span>
          <span className="ps-dh" style={{ top: `${py}%`, bottom: `${py}%` }}>
            <span>{item.heightIn.toFixed(2)} in</span>
          </span>
        </div>
      </div>
      <figcaption className="ps-foot">
        <span>
          {getShape(item.shape).name} · {getMaterial(item.material).name} · {fmtQty(item.qty)} pcs
        </span>
        <span>
          <i>- - -</i> cut line{item.shape === "diecut" ? " (follows outline)" : ""}
        </span>
      </figcaption>
    </figure>
  );
}
