import { fileQuality, QUALITY_LABEL } from "@/components/configurator/ArtQuality";
import { CATALOG, getMaterial, getShape, type ShapeId } from "@/lib/catalog";
import { fmtQty, money } from "@/lib/format";
import { inch } from "@/lib/config";
import type { FileRow, OrderItemRow } from "@/server/queries";

/** Spec list for a saved order item (the order-page version of the cart's ItemSpecs). */
export function OrderItemSpecs({ item, files }: { item: OrderItemRow; files: FileRow[] }) {
  const mine = files.filter((f) => f.orderItemId === item.id && f.kind !== "proof");
  return (
    <dl className="specs">
      <dt>Shape</dt>
      <dd>{getShape(item.shape).name}</dd>
      <dt>Size</dt>
      <dd>
        {inch(item.widthIn)} × {inch(item.heightIn)}
      </dd>
      <dt>Quantity</dt>
      <dd>{fmtQty(item.qty)}</dd>
      <dt>Material</dt>
      <dd>{getMaterial(item.material).name}</dd>
      {item.laminate ? (
        <>
          <dt>Extra</dt>
          <dd>{CATALOG.options[0].name}</dd>
        </>
      ) : null}
      {item.rush ? (
        <>
          <dt>Extra</dt>
          <dd>{CATALOG.options[1].name}</dd>
        </>
      ) : null}
      <dt>Design help</dt>
      <dd>{item.designHelp ? "Yes" : "No"}</dd>
      {item.enhance ? (
        <>
          <dt>Enhancement</dt>
          <dd>Sharpen &amp; enlarge image</dd>
        </>
      ) : null}
      <dt>Artwork</dt>
      <dd>
        {mine.length ? (
          mine.map((f, i) => {
            const q = f.width && f.height ? fileQuality({ name: f.originalName, size: f.sizeBytes, type: f.ext, url: null, width: f.width, height: f.height }, { w: item.widthIn, h: item.heightIn }, item.shape as ShapeId, item.artFit ?? undefined) : null;
            return (
              <span key={f.id}>
                {i ? ", " : ""}
                {f.originalName}
                {q && q.level !== "good" && !item.enhance ? (
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
      {item.designNotes ? (
        <>
          <dt>Notes</dt>
          <dd style={{ fontWeight: 400 }}>{item.designNotes}</dd>
        </>
      ) : null}
      <dt>Price</dt>
      <dd>{money(item.priceCents)}</dd>
    </dl>
  );
}
