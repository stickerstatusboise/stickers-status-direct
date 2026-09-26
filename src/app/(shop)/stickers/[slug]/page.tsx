import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { fromPriceCents } from "@/components/shop/ProductCard";
import { Configurator } from "@/components/configurator/Configurator";
import { ConfiguratorLoader } from "@/components/configurator/ConfiguratorLoader";
import { CATALOG, findProduct } from "@/lib/catalog";
import { money } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATALOG.products.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/stickers/[slug]">): Promise<Metadata> {
  const p = findProduct((await params).slug);
  if (!p) return {};
  return {
    title: `Custom ${p.name}`,
    description: `${p.blurb} Custom ${p.name.toLowerCase()} from ${money(fromPriceCents(p.id))} for 50, with a free digital proof before printing. Made by Sticker Status in Boise, Idaho.`,
    alternates: { canonical: `/stickers/${p.id}` },
  };
}

export default async function ProductPage({ params }: PageProps<"/stickers/[slug]">) {
  const p = findProduct((await params).slug);
  if (!p) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Custom ${p.name}`,
    description: p.blurb,
    brand: { "@type": "Brand", name: "Sticker Status Direct" },
    offers: { "@type": "Offer", priceCurrency: "USD", price: (fromPriceCents(p.id) / 100).toFixed(2), availability: "https://schema.org/InStock" },
  };
  return (
    <>
      <Suspense fallback={<Configurator productId={p.id} />}>
        <ConfiguratorLoader productId={p.id} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
