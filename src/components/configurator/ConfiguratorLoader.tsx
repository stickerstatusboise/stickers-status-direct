"use client";

import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/cart-store";
import { Configurator } from "./Configurator";

/** Opens the configurator fresh, or loaded with a cart item when the URL has ?edit=<uid>. */
export function ConfiguratorLoader({ productId }: { productId: string }) {
  const editUid = useSearchParams().get("edit");
  const items = useCart();
  if (editUid && items === null) return <div className="wrap" style={{ minHeight: "80vh" }} />;
  const editing = editUid ? items?.find((i) => i.uid === editUid) : undefined;
  return <Configurator key={editing?.uid ?? "new"} productId={productId} editing={editing} />;
}
