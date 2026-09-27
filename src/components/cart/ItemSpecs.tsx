import { fileQuality, QUALITY_LABEL } from "@/components/configurator/ArtQuality";
import { CATALOG, getMaterial, getShape } from "@/lib/catalog";
import { dimLabel, dims } from "@/lib/config";
import { fmtQty, money } from "@/lib/format";
import type { CartItem } from "./cart-store";

export function ItemSpecs({ item }: { item: CartItem }) {
  return (
    <dl className="specs">
      <dt>Shape</dt>
      <dd>{getShape(item.shape).name}</dd>
      <dt>Size</dt>
      <dd>{dimLabel(item)}</dd>
      <dt>Quantity</dt>
      <dd>{fmtQty(item.qty)}</dd>
      <dt>Material</dt>
      <dd>{getMaterial(item.material).name}</dd>
      {CATALOG.options
        .filter((o) => item.options[o.id])
        .map((o) => (
          <div key={o.id} className="contents">
            <dt>Extra</dt>
            <dd>{o.name}</dd>
          </div>
        ))}
      <dt>Design help</dt>
      <dd>{item.designHelp ? `Yes (+${money(CATALOG.designFee * 100)})` : "No"}</dd>
      <dt>Artwork</dt>
      <dd>
        {item.files.length ? (
          item.files.map((f, i) => {
            const q = fileQuality(f, dims(item), item.shape, f.url && f === item.files.find((x) => x.url) ? item.artFit : undefined);
            return (
              <span key={i}>
                {i ? ", " : ""}
                {f.name}
                {q && q.level !== "good" ? (
                  <span className="qbadge" data-level={q.level}>
                    {QUALITY_LABEL[q.level]}
                  </span>
                ) : null}
              </span>
            );
          })
        ) : (
          <span className="muted">None, design help</span>
        )}
      </dd>
      {item.artFit ? (
        <>
          <dt>Placement</dt>
          <dd>Artwork resized/moved on the preview ({Math.round(item.artFit.scale * 100)}%)</dd>
        </>
      ) : null}
      {item.designNotes ? (
        <>
          <dt>Notes</dt>
          <dd style={{ fontWeight: 400 }}>{item.designNotes}</dd>
        </>
      ) : null}
    </dl>
  );
}
