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

const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL("https://fabionasc1mento.github.io"),
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: pt.meta.title,
    description: pt.meta.description,
    url: "https://fabionasc1mento.github.io/",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="dark": o escuro é o padrão. O script troca para o tema
    // salvo antes da página desenhar (sem piscar o tema errado).
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
