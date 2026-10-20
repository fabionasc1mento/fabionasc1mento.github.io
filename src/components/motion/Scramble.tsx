"use client";

import { createElement, useEffect, useRef } from "react";

const GLYPHS = "!<>-_/[]{}=+*^?#01%$&@";

type ScrambleProps = {
  text: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  className?: string;
  id?: string;
  /** duração em ms */
  duration?: number;
};

// Texto que "decodifica": quando entra na tela (e quando o texto muda, como
// na troca de idioma), as letras passam por símbolos aleatórios até formar
// a palavra. Leitor de tela lê o texto real (escondido só visualmente).
export function Scramble({ text, as = "span", className, id, duration = 700 }: ScrambleProps) {
  const visual = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = visual.current;
    if (!el) return;
    el.textContent = text;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Já começa embaralhado: sem isso a palavra pronta pisca por um quadro
    // antes de a animação começar
    el.textContent = Array.from(text, (ch, i) => (ch === " " ? ch : GLYPHS[(i * 7) % GLYPHS.length])).join("");

    let frame = 0;
    let started = false;

    const run = () => {
      started = true;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        let out = "";
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          // Cada letra "trava" no lugar em um momento diferente, da esquerda para a direita
          const lockAt = (i / text.length) * 0.7 + 0.3;
          out += ch === " " || p >= lockAt ? ch : GLYPHS[(i * 7 + Math.floor(now / 45) * 13) % GLYPHS.length];
        }
        el.textContent = out;
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !started) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [text, duration]);

  return createElement(
    as,
    { className, id },
    <span className="visually-hidden">{text}</span>,
    <span ref={visual} aria-hidden="true">
      {text}
    </span>,
  );
}
