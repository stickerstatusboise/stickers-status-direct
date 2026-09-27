import { StickerPreview } from "@/components/sticker/StickerPreview";
import { getProduct, type ArtKey, type MaterialId, type ShapeId } from "@/lib/catalog";

/** Sticker mockup for an order item. Uses the order's placeholder art, else the product's sample art. */
export function OrderItemSticker({
  item,
  art,
  label,
}: {
  item: { productId: string; shape: string; material: string; widthIn: number; heightIn: number };
  art?: ArtKey | null;
  label?: string;
}) {
  const p = getProduct(item.productId);
  return (
    <StickerPreview
      art={art ?? p.art}
      shape={item.shape as ShapeId}
      material={item.material as MaterialId}
      w={item.widthIn}
      h={item.heightIn}
      label={label ?? p.name}
    />
  );
}
