import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3020";
  return ["", "/store", "/vehicles/ferrari-488-gtb", "/catalog", "/sources"].map((p) => ({ url: site + p, changeFrequency: "weekly" }));
}
