import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/env";
import { listPublishedSlugs } from "@/server/queries/public-pages";

const STATIC_PATHS = [
  "/",
  "/faq",
  "/contact",
  "/donation-terms",
  "/privacy",
  "/terms",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const published = await listPublishedSlugs();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const pageEntries: MetadataRoute.Sitemap = published.map((page) => ({
    url: absoluteUrl(`/d/${page.slug}`),
    lastModified: page.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...pageEntries];
}
