import type { NextConfig } from "next";

const api = process.env.API_URL ?? "http://127.0.0.1:8088";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Product photos are served from the client's own store.
  images: { remotePatterns: [{ protocol: "https", hostname: "autovivo.it", pathname: "/wp-content/uploads/**" }] },
  // Browser calls go to /api/v1/* on the same origin so the admin cookie stays first-party.
  async rewrites() {
    // Snapshot builds (NEXT_PUBLIC_STATIC_DATA=1) have no API to forward to.
    return process.env.NEXT_PUBLIC_STATIC_DATA === "1" ? [] : [{ source: "/api/v1/:path*", destination: `${api}/api/v1/:path*` }];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        ...(process.env.NEXT_PUBLIC_NOINDEX === "1" ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
      ],
    }];
  },
};

export default nextConfig;
