import type { Metadata, Viewport } from "next";
import "@fontsource/schibsted-grotesk/400.css";
import "@fontsource/schibsted-grotesk/500.css";
import "@fontsource/schibsted-grotesk/600.css";
import "@fontsource/unbounded/400.css";
import "@fontsource/unbounded/700.css";
import "@fontsource/unbounded/900.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "lenis/dist/lenis.css";
import "./globals.css";
import { dictionaries } from "@/i18n/dictionary";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const pt = dictionaries.pt;

export const metadata: Metadata = {
  metadataBase: new URL("https://fabionasc1mento.github.io"),
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: pt.meta.title,
    description: pt.meta.description,
    url: "https://fabionasc1mento.github.io/",
    type: "website",
    images: ["/img/fabio.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#e3e3e1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
