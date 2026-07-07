import type { MetadataRoute } from "next";
import { listCollections, listDocumentIds } from "@/lib/api";

// Generated at build time (static export). SITE URL includes the GitHub Pages
// subpath, so entries here must NOT add the basePath again.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [collections, documentIds] = await Promise.all([
    listCollections(),
    listDocumentIds(),
  ]);

  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search/`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/topics/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/images/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/about/`, changeFrequency: "monthly", priority: 0.3 },
    ...collections.map((c) => ({
      url: `${SITE_URL}/topics/${c.slug}/`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...documentIds.map((id) => ({
      url: `${SITE_URL}/documents/${id}/`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
