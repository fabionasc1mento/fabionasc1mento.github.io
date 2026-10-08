import type { NextConfig } from "next";

// "export" gera HTML/CSS/JS estáticos na pasta out/, que é o que o
// GitHub Pages consegue servir (ele não roda servidor Node).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
