import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { CATALOG } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop custom stickers",
  description: "Die cut, circle, square, rectangle, oval, clear, holographic and reflective custom stickers. Free digital proof on every order.",
  alternates: { canonical: "/stickers" },
};

export default function ShopPage() {
  return (
    <div className="wrap">
      <div className="page-hd">
        <div className="crumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Shop</span>
        </div>
        <h1>Shop stickers</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          Choose a style to start. You can change shape and material in the next step, so don&apos;t overthink it. Not sure? Die cut is the
          most popular.
        </p>
      </div>
      <div className="pgrid" style={{ paddingBottom: 80 }}>
        {CATALOG.products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
