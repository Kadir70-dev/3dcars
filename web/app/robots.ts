import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3020";
  // Private previews (NEXT_PUBLIC_NOINDEX=1) ask every crawler to stay out until the client approves going public.
  if (process.env.NEXT_PUBLIC_NOINDEX === "1") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/quote", "/dev/"] }, sitemap: `${site}/sitemap.xml` };
}
