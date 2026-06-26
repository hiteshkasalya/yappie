import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/confessions"],
      disallow: ["/api/", "/admin/", "/chat/", "/friends/"],
    },
    sitemap: "https://yappie.in/sitemap.xml",
  };
}
