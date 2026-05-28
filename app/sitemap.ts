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
  "/fit-quiz",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/shop" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.8,
  }));

  try {
    const products = await db.product.findMany({
      select: {
        id: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${siteUrl}/product/${product.id}`,
      lastModified: product.updatedAt || product.createdAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticEntries, ...productEntries];
  } catch {
    return staticEntries;
  }
}
