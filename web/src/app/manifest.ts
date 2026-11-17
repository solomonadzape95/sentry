import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — Predictive medicine supply intelligence`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/m",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f6f4",
    theme_color: "#0a332c",
    categories: ["medical", "business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scan medicine", short_name: "Scan", url: "/m/scan" },
      { name: "Issue stock", short_name: "Issue", url: "/m/issue" },
      { name: "Network overview", short_name: "Network", url: "/" },
    ],
  };
}
