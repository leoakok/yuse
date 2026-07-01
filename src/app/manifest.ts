import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site/metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#c45c2a",
    lang: "en-GB",
    icons: [
      {
        src: "/yuse-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/yuse-logo@2x.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
