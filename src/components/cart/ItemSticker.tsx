import { StickerPreview } from "@/components/sticker/StickerPreview";
import { getProduct } from "@/lib/catalog";
import { dims } from "@/lib/config";
import type { CartItem } from "./cart-store";

/** Sticker mockup for a cart item: the customer's image if we have a preview, else the product's sample art. */
export function ItemSticker({ item }: { item: CartItem }) {
  const d = dims(item);
  const p = getProduct(item.productId);
  const img = item.files.find((f) => f.url);
  return <StickerPreview url={img?.url} art={img ? undefined : p.art} shape={item.shape} material={item.material} w={d.w} h={d.h} label={p.name} />;
}
