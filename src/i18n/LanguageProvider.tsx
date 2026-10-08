"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dictionaries, type Dictionary, type Lang } from "./dictionary";

type LanguageContextValue = {
  lang: Lang;
  t: Dictionary;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "lang";

// O HTML estático sai em português (é o que o build gera).
// No navegador, trocamos para a escolha salva ou, na primeira visita,
// para o idioma do navegador da pessoa.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("pt");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage pode estar bloqueado (aba anônima, por exemplo)
    }
    const initial: Lang =
      saved === "pt" || saved === "en"
        ? saved
        : navigator.language.toLowerCase().startsWith("pt")
          ? "pt"
          : "en";
    setLang(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((current) => {
      const next: Lang = current === "pt" ? "en" : "pt";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // sem localStorage, a troca vale só até recarregar a página
      }
      return next;
    });
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t: dictionaries[lang], toggle }}>
      {/* No React 19, <title> e <meta> renderizados aqui vão para o <head>
          sozinhos e mudam junto com o idioma. */}
      <title>{dictionaries[lang].meta.title}</title>
      <meta name="description" content={dictionaries[lang].meta.description} />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage precisa estar dentro de <LanguageProvider>");
  return value;
}
