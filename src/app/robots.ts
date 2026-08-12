import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/embed",
        "/api",
        "/pages",
        "/settings",
        "/widget",
        "/analytics",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/dev",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
