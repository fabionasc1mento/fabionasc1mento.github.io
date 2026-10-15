"use client";

import { useEffect } from "react";

// Um único observador para a página inteira: todo elemento com
// [data-reveal] ganha data-inview="true" quando entra na tela (uma vez só).
// O CSS em globals.css anima a partir disso (linhas que se desenham,
// blocos que sobem, glitch...). A classe "motion" no <html> garante que,
// sem JavaScript, nada fique escondido.
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("motion");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.inview = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    const observeAll = () =>
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-inview])").forEach((el) => observer.observe(el));
    observeAll();

    // Elementos que aparecem depois (troca de idioma, por exemplo)
    const mutations = new MutationObserver(observeAll);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.classList.remove("motion");
    };
  }, []);

  return null;
}
