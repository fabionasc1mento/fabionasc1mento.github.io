"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./NameFlight.module.css";

type Box = { x: number; y: number; size: number };

// Quanto da rolagem (em fração da altura da tela) a viagem leva
const TRAVEL = 0.6;
// Atraso entre uma letra e a próxima, em fração da viagem
const STAGGER = 0.045;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// O nome grande do hero e o nome do cabeçalho ficam invisíveis e servem só
// de "molde": medimos onde cada letra começa (hero) e onde termina
// (cabeçalho). Uma camada por cima da página desenha as letras de verdade
// e, a cada quadro, posiciona cada uma entre o começo e o fim de acordo
// com a rolagem. Rolou para baixo, as letras sobem; voltou, elas descem.
export function NameFlight() {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const chars = Array.from(t.hero.name);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("name-flight");

    let start: Box[] = [];
    let end: Box[] = [];
    let frame = 0;

    const measure = () => {
      const fromEls = document.querySelectorAll<HTMLElement>("[data-name-start]");
      const toEls = document.querySelectorAll<HTMLElement>("[data-name-end]");
      // Início em coordenadas da página (o hero rola junto); fim em
      // coordenadas da tela (o cabeçalho é fixo no topo).
      start = Array.from(fromEls, (el, i) => {
        // A letra da camada nasce do tamanho do hero e só encolhe (fica nítida)
        const layerLetter = letters.current[i];
        if (layerLetter) layerLetter.style.fontSize = getComputedStyle(el).fontSize;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top + window.scrollY, size: parseFloat(getComputedStyle(el).fontSize) };
      });
      end = Array.from(toEls, (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, size: parseFloat(getComputedStyle(el).fontSize) };
      });
      render();
    };

    const render = () => {
      const travel = window.innerHeight * TRAVEL;
      const progress = clamp(window.scrollY / travel);
      const span = 1 - STAGGER * (chars.length - 1);

      letters.current.forEach((el, i) => {
        const a = start[i];
        const b = end[i];
        if (!el || !a || !b) return;
        const k = ease(clamp((progress - i * STAGGER) / span));
        const x = lerp(a.x, b.x, k);
        // Um pequeno arco no meio do caminho, para não parecer um elevador
        const y = lerp(a.y - window.scrollY, b.y, k) - Math.sin(Math.PI * k) * 24;
        const scale = lerp(1, b.size / a.size, k);
        el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
        el.dataset.done = String(k === 1);
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    };

    measure();
    document.fonts?.ready.then(measure);
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      root.classList.remove("name-flight");
      resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [enabled, chars.length]);

  if (!enabled) return null;

  return (
    <div className={styles.layer} aria-hidden="true">
      {chars.map((char, i) => (
        <span
          key={i}
          ref={(el) => {
            letters.current[i] = el;
          }}
          className={styles.letter}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </div>
  );
}
