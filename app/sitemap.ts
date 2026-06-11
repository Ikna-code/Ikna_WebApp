import type { MetadataRoute } from "next";
import { db } from "@/backend/lib/db";

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "http://localhost:3000";
const siteUrl = rawSiteUrl.startsWith("http")
  ? rawSiteUrl
  : `https://${rawSiteUrl}`;

const publicRoutes = [
  "/",
  "/shop",
  "/about-us",
  "/FAQs",
  "/reviews",
  "/privacy-policy",
  "/terms-and-conditions",
  "/sitemap",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dbProductAny = (db as any).product;

  const staticEntries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/shop" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.8,
  }));

  try {
    const products: Array<{ id: string; createdAt?: Date | null }> = await dbProductAny.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${siteUrl}/product/${product.id}`,
      lastModified: product.createdAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticEntries, ...productEntries];
  } catch {
    return staticEntries;
  }
}
