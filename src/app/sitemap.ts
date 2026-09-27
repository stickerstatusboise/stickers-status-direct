import type { MetadataRoute } from "next";
import { CATALOG } from "@/lib/catalog";

const BASE = "https://stickerstatusdirect.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/stickers`, changeFrequency: "weekly", priority: 0.9 },
    ...CATALOG.products.map((p) => ({ url: `${BASE}/stickers/${p.id}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${BASE}/business`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
