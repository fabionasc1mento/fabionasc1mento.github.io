"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./SectionNav.module.css";

const SECTION_IDS = ["experiencia", "projetos", "formacao", "curriculo", "contato"] as const;
type SectionId = (typeof SECTION_IDS)[number];

// Onde a seção está na "linha do tempo" do painel
type Place = "next" | "active" | "passed";

// Marcas da régua: um traço a cada 2%, número a cada 25%
const TICKS = Array.from({ length: 51 }, (_, i) => i * 2);

// Posição de uma letra: x, y, escala
type Spot = { x: number; y: number; s: number };
type LetterSpots = { next: Spot; active: Spot; passed: Spot; offset: number };

const FLY_MS = 1200; // subir/descer pela lateral
const SHIFT_MS = 700; // título que encolhe para a lista de cima (e volta)
const STAGGER_MS = 18;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

const transformOf = (x: number, y: number, rotate: number, s: number) =>
  `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${s})`;

// Painel lateral direito (só em telas largas; o conteúdo do site termina
// antes dele, então nada fica sobreposto). Funciona como uma linha do tempo:
// - seções que já passaram ficam pequenas no alto;
// - a seção atual é o título grande, logo abaixo delas;
// - as próximas esperam pequenas embaixo.
// Quando a próxima seção entra, as letras dela sobem "em pé" pela lateral
// até virarem o título, e o título anterior encolhe para a lista de cima.
// Rolando para cima, tudo faz o caminho inverso.
export function SectionNav() {
  const { t } = useLanguage();
  const [active, setActive] = useState<SectionId | null>(null);
  const [hovered, setHovered] = useState<SectionId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<SectionId | null>(null);
  const spots = useRef<Partial<Record<SectionId, LetterSpots[]>>>({});
  const edge = useRef({ x: 0, scale: 1 });
  const places = useRef<Partial<Record<SectionId, Place>>>({});

  const labels: Record<SectionId, string> = {
    experiencia: t.nav.experience,
    projetos: t.nav.projects,
    formacao: t.nav.education,
    curriculo: t.nav.resume,
    contato: t.nav.contact,
  };

  const placeOf = (id: SectionId, current: SectionId | null): Place => {
    if (!current) return "next";
    const diff = SECTION_IDS.indexOf(id) - SECTION_IDS.indexOf(current);
    return diff === 0 ? "active" : diff < 0 ? "passed" : "next";
  };

  // Move as letras de cada seção para o lugar novo
  const update = useCallback((animate: boolean) => {
    const fly = flyRef.current;
    if (!fly) return;
    const current = activeRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    SECTION_IDS.forEach((id) => {
      const letterSpots = spots.current[id];
      if (!letterSpots) return;
      const to = placeOf(id, current);
      const from = places.current[id] ?? to;
      places.current[id] = to;

      const letters = fly.querySelectorAll<HTMLElement>(`[data-fly="${id}"] [data-fly-letter]`);
      // Indo de baixo para cima (ou o contrário): sobe pela lateral
      const climbs = (from === "next") !== (to === "next");
      const goingUp = from === "next";

      letters.forEach((letter, i) => {
        const spot = letterSpots[i];
        if (!spot) return;
        const end = spot[to];
        const final = transformOf(end.x, end.y, 0, end.s);

        if (!animate || reduce || from === to) {
          letter.getAnimations().forEach((a) => a.cancel());
          letter.style.transform = final;
          return;
        }

        // Começa de onde a letra está agora (mesmo se estiver no meio do voo)
        const now = getComputedStyle(letter).transform;
        letter.getAnimations().forEach((a) => a.cancel());
        letter.style.transform = final;

        if (!climbs) {
          letter.animate([{ transform: now === "none" ? final : now }, { transform: final }], {
            duration: SHIFT_MS,
            easing: EASE,
            delay: i * STAGGER_MS * 0.5,
            fill: "backwards",
          });
          return;
        }

        // Na lateral a palavra fica em pé (girada -90°), lida de baixo para
        // cima: cada letra fica acima da anterior.
        const top = goingUp ? end : spot[from];
        const bottom = spot.next;
        const { x: edgeX, scale: edgeS } = edge.current;
        const along = spot.offset * edgeS;
        const word = letterSpots[letterSpots.length - 1].offset * edgeS;
        const low = transformOf(edgeX, bottom.y - along, -90, edgeS);
        const high = transformOf(edgeX, top.y + word + 24 - along, -90, edgeS);
        const path = goingUp ? [low, high] : [high, low];

        letter.animate(
          [
            { transform: now === "none" ? final : now, offset: 0 },
            { transform: path[0], offset: 0.22 },
            { transform: path[1], offset: 0.78 },
            { transform: final, offset: 1 },
          ],
          // Sem atraso entre letras: na subida a palavra anda inteira (com
          // atraso, as letras se espalhariam pela lateral)
          { duration: FLY_MS, easing: EASE, fill: "backwards" },
        );
      });
    });
  }, []);

  // Mede as posições a partir de moldes invisíveis: a lista de cima, a de
  // baixo e um título fantasma por seção (cada um logo abaixo da lista de
  // cima, na altura em que ele vai aparecer).
  const measure = useCallback(() => {
    const panel = panelRef.current;
    const ghost = ghostRef.current;
    const fly = flyRef.current;
    if (!panel || !ghost || !fly) return;
    if (getComputedStyle(panel).display === "none") return; // tela estreita

    const origin = panel.getBoundingClientRect();
    const next: typeof spots.current = {};
    let listScale = 0.5;
    let base = 1;

    SECTION_IDS.forEach((id) => {
      const head = ghost.querySelector<HTMLElement>(`[data-ghost-head="${id}"]`);
      if (!head) return;
      // Nome comprido demais para o painel: diminui só o dele
      head.style.fontSize = "";
      if (head.scrollWidth > head.clientWidth) {
        const size = parseFloat(getComputedStyle(head).fontSize);
        head.style.fontSize = `${(size * head.clientWidth) / head.scrollWidth}px`;
      }

      const pick = (selector: string) => ghost.querySelectorAll<HTMLElement>(`${selector} [data-ghost-letter]`);
      const headLetters = pick(`[data-ghost-head="${id}"]`);
      const topLetters = pick(`[data-ghost-top="${id}"]`);
      const bottomLetters = pick(`[data-ghost-bottom="${id}"]`);
      const flyLetters = fly.querySelectorAll<HTMLElement>(`[data-fly="${id}"] [data-fly-letter]`);

      const first = bottomLetters[0]?.getBoundingClientRect().left ?? 0;
      next[id] = Array.from(flyLetters).map((letter, i) => {
        base = Math.max(1, letter.offsetHeight);
        const toSpot = (el: HTMLElement | undefined): Spot => {
          if (!el) return { x: 0, y: 0, s: 0 };
          const r = el.getBoundingClientRect();
          return { x: r.left - origin.left, y: r.top - origin.top, s: r.height / base };
        };
        const nextSpot = toSpot(bottomLetters[i]);
        listScale = nextSpot.s || listScale;
        return {
          next: nextSpot,
          active: toSpot(headLetters[i]),
          passed: toSpot(topLetters[i]),
          // Distância da letra até o começo da palavra, já na escala da lista
          offset: ((bottomLetters[i]?.getBoundingClientRect().left ?? first) - first) / listScale,
        };
      });
    });

    // Coluna da lateral por onde as palavras sobem: logo antes da régua
    const edgeScale = listScale * 1.3;
    const ruler = railRef.current?.getBoundingClientRect();
    const rulerLeft = ruler ? ruler.left - origin.left : origin.width - 28;
    edge.current = { x: rulerLeft - 10 - base * edgeScale, scale: edgeScale };

    spots.current = next;
    update(false);
  }, [update]);

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
    update(true);
  }, [active, update]);

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
      // Voltou para o topo (acima da primeira seção): nenhuma seção ativa
      const first = document.getElementById(SECTION_IDS[0]);
      if (first && window.scrollY + window.innerHeight * 0.45 < first.offsetTop) setActive(null);
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

  const goTo = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const activeNumber = active ? String(SECTION_IDS.indexOf(active) + 1).padStart(2, "0") : "--";
  const total = String(SECTION_IDS.length).padStart(2, "0");

  const ghostWord = (id: SectionId) =>
    Array.from(labels[id]).map((char, i) => (
      <span key={i} data-ghost-letter="">
        {char}
      </span>
    ));

  // O painel é só visual (aria-hidden): quem usa teclado ou leitor de tela
  // navega pelo menu do cabeçalho, que tem os mesmos links.
  return (
    <div ref={panelRef} className={styles.panel} aria-hidden="true">
      <p className={`label ${styles.top}`}>
        <span>
          <span className="ast">✱ </span>
          {t.sections.indexLabel}
        </span>
        <span className={styles.count}>
          {activeNumber} / {total}
        </span>
      </p>

      {/* Moldes invisíveis */}
      <div ref={ghostRef} className={styles.ghosts}>
        <ol className={`display ${styles.listTop}`}>
          {SECTION_IDS.map((id) => (
            <li key={id} data-ghost-top={id}>
              {ghostWord(id)}
            </li>
          ))}
        </ol>
        {SECTION_IDS.map((id, i) => (
          <p
            key={id}
            data-ghost-head={id}
            className={`display ${styles.heading}`}
            style={{ ["--i" as string]: i }}
          >
            {ghostWord(id)}
          </p>
        ))}
        <ol className={`display ${styles.listBottom}`}>
          {SECTION_IDS.map((id) => (
            <li key={id} data-ghost-bottom={id}>
              {ghostWord(id)}
            </li>
          ))}
        </ol>
      </div>

      {/* Camada das letras que voam */}
      <div ref={flyRef} className={styles.fly}>
        {SECTION_IDS.map((id) => (
          <span
            key={id}
            data-fly={id}
            data-active={active === id}
            data-hover={hovered === id && active !== id}
            onClick={() => goTo(id)}
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
          >
            {Array.from(labels[id]).map((char, i) => (
              <span key={i} data-fly-letter="" className={`display ${styles.flyLetter}`}>
                {char}
              </span>
            ))}
          </span>
        ))}
      </div>

      <div ref={railRef} className={styles.ruler} onClick={jumpTo}>
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
