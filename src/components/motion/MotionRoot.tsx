"use client";

import { useEffect } from "react";
import { getLandingMotion } from "@/motion/setup";

// Um init só para a página inteira: rolagem suave (Lenis no relógio do
// GSAP), preloader, entrada do hero e todas as cenas marcadas com data-*.
// destroy() desfaz tudo (troca de rota ou hot reload).
export function MotionRoot() {
  useEffect(() => {
    const LandingMotion = getLandingMotion();
    if (!LandingMotion) return;

    // Já viu a abertura nesta sessão (o script do <head> marcou o <html>):
    // o preloader fica escondido pelo CSS e o runtime não o executa.
    if (document.documentElement.classList.contains("intro-seen")) {
      document.querySelector("[data-preloader]")?.removeAttribute("data-preloader");
    }

    // Ritmo do "cybercore": um pouco mais rápido e seco que o padrão
    Object.assign(LandingMotion.tokens.dur, { base: 0.8, slow: 1.1 });
    Object.assign(LandingMotion.tokens.dist, { md: 48 });

    const motion = LandingMotion.init();
    // Troca de idioma muda alturas: re-mede as cenas presas à rolagem
    const onLang = () => requestAnimationFrame(() => motion.refresh());
    document.addEventListener("langchange", onLang);
    return () => {
      document.removeEventListener("langchange", onLang);
      motion.destroy();
    };
  }, []);

  return null;
}
