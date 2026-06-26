import { MetadataRoute } from "next";
import fs from "fs";
import path from "path";

const EXCLUDE_ROUTES = new Set([
  "api",
  "admin",
  "chat",
  "friends",
  "_not-found",
  "icon.svg",
]);

function getPublicRoutes(dir: string, baseDir: string = ""): string[] {
  let routes: string[] = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Exclude system folders, dynamic folders, and private paths
        if (
          item.startsWith("_") || 
          item.startsWith("(") || 
          item.includes("[") || 
          item.includes("]") ||
          EXCLUDE_ROUTES.has(item)
        ) {
          continue;
        }
        
        const relativeRoute = baseDir ? `${baseDir}/${item}` : item;
        
        const hasPage = 
          fs.existsSync(path.join(fullPath, "page.tsx")) ||
          fs.existsSync(path.join(fullPath, "page.ts")) ||
          fs.existsSync(path.join(fullPath, "page.js")) ||
          fs.existsSync(path.join(fullPath, "page.jsx"));
          
        if (hasPage) {
          routes.push(relativeRoute);
        }
        
        // Traverse subdirectories recursively
        routes = routes.concat(getPublicRoutes(fullPath, relativeRoute));
      }
    }
  } catch (error) {
    console.error("Error generating dynamic routes:", error);
  }
  return routes;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://yappie.in";
  const appDirectory = path.join(process.cwd(), "src/app");
  
  const publicRoutes = ["", ...getPublicRoutes(appDirectory)];
  
  return publicRoutes.map((route) => {
    const isRoot = route === "";
    return {
      url: isRoot ? baseUrl : `${baseUrl}/${route}`,
      lastModified: new Date(),
      changeFrequency: isRoot ? "daily" : "weekly",
      priority: isRoot ? 1.0 : 0.8,
    };
  });
}
