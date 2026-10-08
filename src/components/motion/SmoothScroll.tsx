"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Rolagem suave com Lenis. Ele continua usando a rolagem nativa do
// navegador por baixo (só suaviza), então sticky, âncoras e o
// IntersectionObserver seguem funcionando normalmente.
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      // Links como href="#projetos" rolam suave; o Lenis respeita o
      // scroll-margin-top das seções, então elas param logo abaixo do cabeçalho
      anchors: true,
    });

    return () => lenis.destroy();
  }, []);

  return null;
}
