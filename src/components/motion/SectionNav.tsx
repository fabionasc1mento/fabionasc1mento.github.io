"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { SplitLetters } from "./SplitLetters";
import styles from "./SectionNav.module.css";

const SECTION_IDS = ["experiencia", "projetos", "formacao", "curriculo", "contato"] as const;
type SectionId = (typeof SECTION_IDS)[number];

// Marcas da régua: um traço a cada 2%, número a cada 25%
const TICKS = Array.from({ length: 51 }, (_, i) => i * 2);

// Atraso entre uma letra e a próxima no voo (em segundos)
const STAGGER = 0.03;

// Painel lateral direito (só em telas largas; o conteúdo do site termina
// antes dele, então nada fica por cima de nada):
// - embaixo, o índice das seções;
// - em cima, o nome da seção atual em letras grandes;
// - na borda, a régua de progresso.
// As letras são uma camada só: cada letra fica no índice e, quando a seção
// dela fica ativa, voa até o topo e cresce. Ao trocar de seção, as letras
// da anterior voltam para o índice e as da nova sobem.
export function SectionNav() {
  const { t } = useLanguage();
  const [active, setActive] = useState<SectionId | null>(null);
  const [hovered, setHovered] = useState<SectionId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<HTMLOListElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<SectionId | null>(null);
  // Onde cada letra fica no índice e no topo: [x, y, escala]
  const spots = useRef<Record<string, { list: number[]; head: number[] }[]>>({});

  const labels: Record<SectionId, string> = {
    experiencia: t.nav.experience,
    projetos: t.nav.projects,
    formacao: t.nav.education,
    curriculo: t.nav.resume,
    contato: t.nav.contact,
  };

  // Coloca cada letra no lugar certo para a seção ativa
  const place = useCallback((animate: boolean) => {
    const fly = flyRef.current;
    if (!fly) return;
    const current = activeRef.current;
    SECTION_IDS.forEach((id) => {
      const letters = fly.querySelectorAll<HTMLElement>(`[data-fly="${id}"] [data-fly-letter]`);
      const toHead = id === current;
      letters.forEach((letter, i) => {
        const spot = spots.current[id]?.[i];
        if (!spot) return;
        const [x, y, s] = toHead ? spot.head : spot.list;
        // Quem sobe sai na ordem; quem desce volta do fim para o começo
        const delay = toHead ? i * STAGGER : (letters.length - 1 - i) * STAGGER * 0.6;
        letter.style.transition = animate ? "" : "none";
        letter.style.transitionDelay = animate ? `${delay}s` : "0s";
        letter.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      });
    });
  }, []);

  // Mede as posições a partir de "moldes" invisíveis: os links do índice e
  // um título fantasma por seção.
  const measure = useCallback(() => {
    const panel = panelRef.current;
    const ghost = ghostRef.current;
    const index = indexRef.current;
    const fly = flyRef.current;
    if (!panel || !ghost || !index || !fly) return;
    if (getComputedStyle(panel).display === "none") return; // tela estreita

    const origin = panel.getBoundingClientRect();
    const next: typeof spots.current = {};

    SECTION_IDS.forEach((id) => {
      const head = ghost.querySelector<HTMLElement>(`[data-ghost="${id}"]`);
      if (!head) return;
      // Nome comprido demais para o painel: diminui só o dele
      head.style.fontSize = "";
      if (head.scrollWidth > head.clientWidth) {
        const size = parseFloat(getComputedStyle(head).fontSize);
        head.style.fontSize = `${(size * head.clientWidth) / head.scrollWidth}px`;
      }

      const headLetters = head.querySelectorAll<HTMLElement>("[data-ghost-letter]");
      const listLetters = index.querySelectorAll<HTMLElement>(`[data-index="${id}"] [data-index-letter]`);
      const flyLetters = fly.querySelectorAll<HTMLElement>(`[data-fly="${id}"] [data-fly-letter]`);

      next[id] = Array.from(flyLetters).map((letter, i) => {
        const base = Math.max(1, letter.offsetHeight);
        const toSpot = (el: HTMLElement | undefined) => {
          if (!el) return [0, 0, 0];
          const r = el.getBoundingClientRect();
          return [r.left - origin.left, r.top - origin.top, r.height / base];
        };
        return { list: toSpot(listLetters[i]), head: toSpot(headLetters[i]) };
      });
    });

    spots.current = next;
    place(false);
  }, [place]);

  // Mede de novo quando as fontes carregam, a janela muda ou o idioma troca
  useEffect(() => {
    let frame = requestAnimationFrame(measure);
    document.fonts?.ready.then(() => measure());
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [measure, t]);

  // Seção ativa mudou: as letras voam
  useEffect(() => {
    activeRef.current = active;
    place(true);
  }, [active, place]);

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

  const jumpTo = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientY - rect.top) / rect.height;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: fraction * max, behavior: "smooth" });
  };

  const activeNumber = active ? String(SECTION_IDS.indexOf(active) + 1).padStart(2, "0") : "--";
  const total = String(SECTION_IDS.length).padStart(2, "0");

  return (
    <div ref={panelRef} className={styles.panel}>
      <p className={`label ${styles.top}`} aria-hidden="true">
        <span>
          <span className="ast">✱ </span>
          {t.sections.indexLabel}
        </span>
        <span className={styles.count}>
          {activeNumber} / {total}
        </span>
      </p>

      {/* Moldes invisíveis do título (um por seção, todos no mesmo lugar) */}
      <div ref={ghostRef} className={styles.ghosts} aria-hidden="true">
        {SECTION_IDS.map((id) => (
          <p key={id} data-ghost={id} className={`display ${styles.heading}`}>
            {Array.from(labels[id]).map((char, i) => (
              <span key={i} data-ghost-letter="">
                {char}
              </span>
            ))}
          </p>
        ))}
      </div>

      <nav aria-label={t.sections.indexLabel} className={styles.index}>
        <ol ref={indexRef}>
          {SECTION_IDS.map((id) => (
            <li key={id} data-index={id}>
              <a
                href={`#${id}`}
                className="display"
                aria-current={active === id ? "true" : undefined}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(id)}
                onBlur={() => setHovered(null)}
              >
                <SplitLetters text={labels[id]} dataAttr="index-letter" />
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Camada das letras que voam */}
      <div ref={flyRef} className={styles.fly} aria-hidden="true">
        {SECTION_IDS.map((id) => (
          <span
            key={id}
            data-fly={id}
            data-active={active === id}
            data-hover={hovered === id && active !== id}
          >
            {Array.from(labels[id]).map((char, i) => (
              <span key={i} data-fly-letter="" className={`display ${styles.flyLetter}`}>
                {char}
              </span>
            ))}
          </span>
        ))}
      </div>

      <div ref={railRef} className={styles.ruler} onClick={jumpTo} aria-hidden="true">
        {TICKS.map((tick) => (
          <span key={tick} className={styles.tick} data-major={tick % 10 === 0} style={{ top: `${tick}%` }}>
            {tick % 25 === 0 && <span className={styles.tickNumber}>{tick}</span>}
          </span>
        ))}
        <span className={styles.marker} />
      </div>
    </div>
  );
}
