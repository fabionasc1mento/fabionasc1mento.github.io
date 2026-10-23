import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "lenis/dist/lenis.css";
import "./globals.css";
import { dictionaries } from "@/i18n/dictionary";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const pt = dictionaries.pt;

const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`;

// Roda antes da primeira pintura (landing-motion):
// - .has-motion esconde o que vai animar, para não piscar antes do GSAP;
// - .intro-seen: a abertura já passou nesta sessão (ou a pessoa pediu menos
//   movimento), então o preloader nem aparece;
// - se o runtime não subir em 4s, mostra a página assim mesmo.
const MOTION_BOOT = `(function(d){d.classList.add("has-motion");try{if(sessionStorage.getItem("intro-seen")||matchMedia("(prefers-reduced-motion: reduce)").matches)d.classList.add("intro-seen");else{sessionStorage.setItem("intro-seen","1");d.classList.add("is-preloading");}}catch(e){}setTimeout(function(){if(window.__lmBooted)return;d.classList.remove("has-motion","is-preloading");document.querySelectorAll("[data-preloader]").forEach(function(n){n.remove()});},4000);})(document.documentElement);`;

// Dados estruturados (schema.org): o "cartão de visita" que buscadores e
// IAs leem direto do código, sem depender do layout. Tudo aqui está no
// currículo; o e-mail fica de fora para não virar alvo de spam.
const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Fábio Tarcio Curvo Nascimento",
  alternateName: "Fábio Tarcio",
  url: "https://fabionasc1mento.github.io/",
  jobTitle: "Desenvolvedor Full Stack",
  worksFor: { "@type": "Organization", name: "ALPIUM" },
  address: { "@type": "PostalAddress", addressLocality: "Cuiabá", addressRegion: "MT", addressCountry: "BR" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "Universidade de Cuiabá (UNIC)" },
  knowsLanguage: ["pt-BR", "en", "es"],
  knowsAbout: [
    "Desenvolvimento full stack",
    "C#",
    ".NET",
    "ASP.NET MVC",
    "Entity Framework",
    "SQL Server",
    "Modelagem de dados",
    "Integração com APIs REST",
    "Arquitetura de software",
    "JavaScript",
    "React",
    "Next.js",
    "PHP",
    "Laravel",
    "UI/UX",
    "Figma",
    "Python",
  ],
  sameAs: ["https://www.linkedin.com/in/fabio-tcn", "https://github.com/fabionasc1mento"],
};

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
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_JSON_LD) }} />
      </head>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
