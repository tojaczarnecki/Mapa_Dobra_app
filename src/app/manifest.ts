import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mapa Dobra",
    short_name: "Mapa Dobra",
    description: "Znajdź pomoc, której potrzebujesz w Łodzi.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0B4F48",
    theme_color: "#0B4F48",
    lang: "pl",
    icons: [
      { src: "/icons/mapa-dobra-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/mapa-dobra-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/mapa-dobra-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
