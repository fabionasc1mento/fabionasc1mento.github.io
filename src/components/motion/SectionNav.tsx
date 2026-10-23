"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { sound } from "@/sound/engine";
import { Scramble } from "./Scramble";
import styles from "./SectionNav.module.css";

const SECTION_IDS = ["experiencia", "projetos", "formacao", "curriculo", "contato"] as const;
type SectionId = (typeof SECTION_IDS)[number];

// Marcas da régua: um traço a cada 2%, número a cada 25%
const TICKS = Array.from({ length: 51 }, (_, i) => i * 2);

// Painel lateral direito (só em telas largas; o conteúdo do site termina
// antes dele, então nada fica sobreposto). Funciona como uma linha do tempo:
// - seções que já passaram ficam pequenas no alto;
// - a seção atual é o título grande, logo abaixo delas;
// - as próximas esperam pequenas embaixo.
// Cada nome que aparece num lugar novo "decodifica" (símbolos aleatórios
// até formar a palavra), o mesmo efeito dos títulos das seções, e o título
// dá uma tremida de glitch.
export function SectionNav() {
  const { t } = useLanguage();
  const [active, setActive] = useState<SectionId | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);

  const labels: Record<SectionId, string> = {
    experiencia: t.nav.experience,
    projetos: t.nav.projects,
    formacao: t.nav.education,
    curriculo: t.nav.resume,
    contato: t.nav.contact,
  };

  const activeIndex = active ? SECTION_IDS.indexOf(active) : -1;

  // Nome comprido demais para o painel: diminui a fonte só dele
  useLayoutEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    el.style.fontSize = "";
    if (el.scrollWidth > el.clientWidth) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = `${(size * el.clientWidth) / el.scrollWidth}px`;
    }
  }, [active, t]);

  // Título trocando: chiado de glitch junto com o embaralhar das letras
  const previous = useRef<SectionId | null>(null);
  useEffect(() => {
    if (active && previous.current && active !== previous.current) sound.glitch();
    previous.current = active;
  }, [active]);

  // Qual seção está cruzando o meio da tela
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id as SectionId);
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

  // Lista de cima (passadas) ou de baixo (próximas). Cada linha tem lugar
  // fixo; quando o nome aparece nela, o Scramble é montado de novo e
  // decodifica.
  const list = (show: (index: number) => boolean, className: string) => (
    <ol className={`display ${className}`}>
      {SECTION_IDS.map((id, i) => (
        <li key={id}>
          {show(i) && (
            <button type="button" tabIndex={-1} className={styles.item} onClick={() => goTo(id)}>
              <Scramble text={labels[id]} duration={450} />
            </button>
          )}
        </li>
      ))}
    </ol>
  );

  const activeNumber = active ? String(activeIndex + 1).padStart(2, "0") : "--";
  const total = String(SECTION_IDS.length).padStart(2, "0");

  // O painel é só visual (aria-hidden): quem usa teclado ou leitor de tela
  // navega pelo menu do cabeçalho, que tem os mesmos links.
  return (
    <div className={styles.panel} aria-hidden="true">
      <p className={`label ${styles.top}`}>
        <span>
          <span className="ast">✱ </span>
          {t.sections.indexLabel}
        </span>
        <span className={styles.count}>
          {activeNumber} / {total}
        </span>
      </p>

      {list((i) => i < activeIndex, styles.listTop)}

      {active && (
        <p
          ref={headingRef}
          key={active}
          className={`display ${styles.heading}`}
          style={{ ["--i" as string]: activeIndex }}
        >
          <Scramble text={labels[active]} duration={700} />
        </p>
      )}

      {list((i) => i > activeIndex, styles.listBottom)}

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
