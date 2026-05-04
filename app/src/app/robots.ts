import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/auth/", "/_next/", "/pdf-worker/"],
    },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
