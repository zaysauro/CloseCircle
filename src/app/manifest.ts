import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CloseCircle",
    short_name: "CloseCircle",
    description: "Seu espaço privado, suas pessoas.",
    start_url: "/app",
    display: "standalone",
    background_color: "#101015",
    theme_color: "#131318",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
