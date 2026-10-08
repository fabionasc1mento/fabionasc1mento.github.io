"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { SplitLetters } from "./SplitLetters";
import styles from "./SectionNav.module.css";

const SECTION_IDS = ["experiencia", "projetos", "formacao", "contato"] as const;
type SectionId = (typeof SECTION_IDS)[number];

// Marcas da régua: um traço a cada 2%, número a cada 25%
const TICKS = Array.from({ length: 51 }, (_, i) => i * 2);

// Navegação lateral (só em telas largas):
// - índice das seções no canto inferior esquerdo;
// - na borda direita, a régua de progresso e o nome da seção atual na
//   vertical. Quando a seção muda, as letras saem do índice e voam até a
//   lateral, girando para a vertical no caminho.
export function SectionNav() {
  const { t } = useLanguage();
  const [active, setActive] = useState<SectionId | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const indexRef = useRef<HTMLOListElement>(null);

  const labels: Record<SectionId, string> = {
    experiencia: t.nav.experience,
    projetos: t.nav.projects,
    formacao: t.nav.education,
    contato: t.nav.contact,
  };

  // Qual seção está cruzando o meio da tela
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id as SectionId);
        else if (window.scrollY < window.innerHeight * 0.5) setActive(null);
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Progresso da rolagem vai para uma variável CSS (sem re-renderizar o React)
  useEffect(() => {
    let frame = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      railRef.current?.style.setProperty("--progress", progress.toFixed(4));
      railRef.current?.setAttribute("data-percent", String(Math.round(progress * 100)));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Voo das letras do índice até a lateral (técnica FLIP: mede o fim,
  // coloca a letra "de volta" no começo com transform e deixa a transição
  // levar até o fim).
  useLayoutEffect(() => {
    if (!active || !labelRef.current || !indexRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = labelRef.current.querySelectorAll<HTMLElement>("[data-rail-letter]");
    const sources = indexRef.current.querySelectorAll<HTMLElement>(
      `[data-index="${active}"] [data-index-letter]`,
    );

    targets.forEach((target, i) => {
      const source = sources[i];
      if (!source) return;
      const from = source.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      // Na lateral a letra está deitada: a altura dela é a largura do retângulo
      const scale = from.height / Math.max(1, to.width);

      target.style.transition = "none";
      target.style.opacity = "0.35";
      target.style.transform = `translate(${dx}px, ${dy}px) rotate(-90deg) scale(${scale})`;
    });

    // Força o navegador a aplicar a posição inicial antes de animar
    void labelRef.current.offsetHeight;

    targets.forEach((target, i) => {
      target.style.transition = `transform 0.75s cubic-bezier(0.2, 0.7, 0.1, 1) ${i * 0.035}s, opacity 0.4s ${i * 0.035}s`;
      target.style.transform = "";
      target.style.opacity = "";
    });
  }, [active, t]);

  const jumpTo = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientY - rect.top) / rect.height;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: fraction * max, behavior: "smooth" });
  };

  return (
    <div className={styles.nav}>
      <nav aria-label={t.sections.indexLabel} className={styles.index} data-visible={active !== null}>
        <ol ref={indexRef}>
          {SECTION_IDS.map((id) => (
            <li key={id} data-index={id} data-active={active === id}>
              <a href={`#${id}`} aria-current={active === id ? "true" : undefined}>
                <SplitLetters text={labels[id]} dataAttr="index-letter" />
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div ref={railRef} className={styles.rail} aria-hidden="true">
        <p ref={labelRef} key={active ?? "none"} className={styles.label}>
          {active &&
            Array.from(labels[active]).map((char, i) => (
              <span key={i} data-rail-letter="">
                {char}
              </span>
            ))}
        </p>
        <div className={styles.ruler} onClick={jumpTo}>
          {TICKS.map((tick) => (
            <span
              key={tick}
              className={styles.tick}
              data-major={tick % 10 === 0}
              style={{ top: `${tick}%` }}
            >
              {tick % 25 === 0 && <span className={styles.tickNumber}>{tick}</span>}
            </span>
          ))}
          <span className={styles.marker} />
        </div>
      </div>
    </div>
  );
}
