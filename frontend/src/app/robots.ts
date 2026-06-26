import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about"],
      disallow: ["/api/", "/admin/", "/chat/", "/friends/", "/confessions"],
    },
    sitemap: "https://yappie.in/sitemap.xml",
  };
}
