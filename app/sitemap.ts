import type { MetadataRoute } from "next";
import { db } from "@/backend/lib/db";
import { generateProductSlug, SITE_URL } from "@/lib/seo";

const staticEntries: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0, lastModified: new Date() },
  { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9, lastModified: new Date() },
  { url: `${SITE_URL}/about-us`, changeFrequency: "monthly", priority: 0.7, lastModified: new Date() },
  { url: `${SITE_URL}/FAQs`, changeFrequency: "monthly", priority: 0.6, lastModified: new Date() },
  { url: `${SITE_URL}/reviews`, changeFrequency: "weekly", priority: 0.6, lastModified: new Date() },
  { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly", priority: 0.3, lastModified: new Date() },
  { url: `${SITE_URL}/terms-and-conditions`, changeFrequency: "yearly", priority: 0.3, lastModified: new Date() },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // ── Category entries ────────────────────────────────────────────────────
    const productTypes: Array<{
      name: string;
      slug: string;
      subcategories: Array<{ name: string; slug: string }>;
    }> = await (db as any).productType.findMany({
      where: { isActive: true },
      select: {
        name: true,
        slug: true,
        subcategories: {
          where: { isActive: true },
          select: { name: true, slug: true },
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    const categoryEntries: MetadataRoute.Sitemap = productTypes.flatMap((pt) => [
      {
        url: `${SITE_URL}/shop/${encodeURIComponent(pt.name)}`,
        changeFrequency: "weekly" as const,
        priority: 0.85,
        lastModified: new Date(),
      },
      ...pt.subcategories.map((sub) => ({
        url: `${SITE_URL}/shop/${encodeURIComponent(pt.name)}?search=${encodeURIComponent(sub.name)}`,
        changeFrequency: "weekly" as const,
        priority: 0.75,
        lastModified: new Date(),
      })),
    ]);

    // ── Product entries (slug-based URLs) ───────────────────────────────────
    const products: Array<{
      id: string;
      name: string;
      colorName: string | null;
      updatedAt: Date;
    }> = await (db as any).product.findMany({
      where: { isDeleted: false, isActive: true },
      select: { id: true, name: true, colorName: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${SITE_URL}/product/${generateProductSlug(product)}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticEntries, ...categoryEntries, ...productEntries];
  } catch {
    return staticEntries;
  }
}
