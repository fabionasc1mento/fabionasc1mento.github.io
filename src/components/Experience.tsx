"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Section } from "./Section";
import styles from "./Experience.module.css";

// Trilha de circuito: o desenho fica em viewBox 0 0 1000 400 e é esticado
// para a largura do palco (preserveAspectRatio="none"). Os nós ficam nos
// trechos retos, em y = 200; entre eles a trilha dá "degraus" de 45°.
const NODES_X = [110, 370, 630, 890];
const NODE_Y = 200;
const TRACE =
  "M 0 200 H 190 L 220 170 H 290 L 320 200 H 450 L 480 230 H 550 L 580 200 H 710 L 740 170 H 810 L 840 200 H 1000";
// Ramais decorativos (só a trilha de base, não se desenham)
const STUBS = [
  "M 220 170 V 110 H 260",
  "M 480 230 V 300 H 440",
  "M 740 170 V 90 H 790",
  "M 840 200 V 320",
];

const PIN_LENGTH = { desktop: 2.8, mobile: 2.4 };
const BLUR_OUT = 0.2;
const REFOCUS = 0.85;
const SETTLE_MS = 140;

// Experiência como a peça principal da página (padrão "pinned path draw"
// do landing-motion): a seção fica parada enquanto você rola, a trilha se
// desenha de 2022 até hoje e cada emprego acende quando a linha chega no nó
// dele. O painel de detalhes troca de conteúdo com "blur swap": desfoca,
// troca na hora e só volta a focar quando a rolagem para.
// Sem movimento (ou sem JS), aparece a lista simples, que também é o que o
// leitor de tela lê.
export function Experience() {
  const { t } = useLanguage();
  // Ordem cronológica na trilha (o dicionário vem do mais recente)
  const jobs = useMemo(() => [...t.experience.jobs].reverse(), [t.experience.jobs]);
  const [active, setActive] = useState(0);
  const pinRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    const pin = pinRef.current;
    if (!pin) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const live = pin.querySelector<SVGPathElement>("[data-trace-live]");
    const tip = pin.querySelector<HTMLElement>("[data-trace-tip]");
    const nodes = Array.from(pin.querySelectorAll<HTMLElement>("[data-node]"));
    if (!live || !tip) return;

    const length = live.getTotalLength();
    // Onde (fração da trilha) cada nó fica: ponto da trilha mais perto dele
    const fractions = NODES_X.map((x) => {
      let best = 0;
      let bestD = Infinity;
      for (let s = 0; s <= 400; s++) {
        const p = live.getPointAtLength((length * s) / 400);
        const d = (p.x - x) ** 2 + (p.y - NODE_Y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = s / 400;
        }
      }
      return best;
    });

    let settle: ReturnType<typeof setTimeout> | undefined;
    const swap = (index: number) => {
      if (index === activeRef.current) return;
      activeRef.current = index;
      const targets = [detailRef.current, counterRef.current].filter(Boolean);
      gsap.to(targets, { filter: "blur(8px)", opacity: 0.35, duration: BLUR_OUT, ease: "power2.out", overwrite: true });
      setActive(index); // troca o conteúdo na hora, ainda desfocado
      clearTimeout(settle);
      settle = setTimeout(() => {
        gsap.to(targets, { filter: "blur(0px)", opacity: 1, duration: REFOCUS, ease: "power2.out", overwrite: true });
      }, SETTLE_MS);
    };

    const render = (progress: number) => {
      live.style.strokeDashoffset = String(1000 * (1 - progress));
      // Ponta da trilha: um "pacote" que corre na frente da linha
      const p = live.getPointAtLength(length * progress);
      tip.style.transform = `translate(${(p.x / 1000) * 100}cqw, ${(p.y / 400) * 100}cqh)`;
      let index = 0;
      nodes.forEach((node, i) => {
        const lit = progress >= fractions[i] - 0.004;
        node.dataset.lit = String(lit);
        if (lit) index = i;
      });
      nodes.forEach((node, i) => (node.dataset.current = String(i === index)));
      swap(index);
    };

    live.style.strokeDasharray = "1000";
    render(0);

    const mm = gsap.matchMedia();
    mm.add({ mobile: "(max-width: 760px)", desktop: "(min-width: 761px)" }, (context) => {
      const factor = context.conditions?.mobile ? PIN_LENGTH.mobile : PIN_LENGTH.desktop;
      const state = { p: 0 };
      const tween = gsap.to(state, {
        p: 1,
        ease: "none",
        onUpdate: () => render(state.p),
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * factor)}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // Enquanto a trilha está fixada, a barra flutuante sai do caminho
          onToggle: (self) => document.documentElement.classList.toggle("is-pinning", self.isActive),
        },
      });
      // Montada com a página já rolada (recarregar no meio, trocar de
      // tamanho de tela): começa do ponto certo, sem esperar a próxima rolagem
      const progress = tween.scrollTrigger?.progress ?? 0;
      tween.progress(progress);
      render(progress);
    });

    return () => {
      clearTimeout(settle);
      mm.revert();
      document.documentElement.classList.remove("is-pinning");
      gsap.set([detailRef.current, counterRef.current], { clearProps: "filter,opacity" });
    };
    // Só a quantidade de empregos muda a geometria. Trocar o idioma só troca
    // o texto: a trilha continua montada (o MotionRoot re-mede as alturas).
  }, [jobs.length]);

  const job = jobs[active];
  const total = String(jobs.length).padStart(2, "0");

  return (
    <Section id="experiencia" number="01" title={t.experience.title} meta={t.sections.experience} wide>
      {/* Versão com movimento: some sem JS e com movimento reduzido */}
      <div ref={pinRef} className={styles.pin} aria-hidden="true">
        <div className={styles.stage}>
          <div className={styles.board}>
            <svg className={styles.svg} viewBox="0 0 1000 400" preserveAspectRatio="none">
              {STUBS.map((d) => (
                <path key={d} d={d} className={styles.stub} />
              ))}
              <path d={TRACE} className={styles.base} />
              {/* pathLength="1000": o tracejado da animação fica na escala do
                  desenho, mesmo com a trilha esticada e o traço sem escala */}
              <path d={TRACE} className={styles.live} data-trace-live="" pathLength={1000} />
            </svg>
            <span className={styles.tip} data-trace-tip="" />

            {jobs.map((item, i) => (
              <div
                key={item.company}
                className={styles.node}
                data-node=""
                data-side={i % 2 === 0 ? "top" : "bottom"}
                style={{ ["--x" as string]: `${NODES_X[i] / 10}%` }}
              >
                <span className={styles.pad} />
                <div className={styles.nodeLabel}>
                  <span className={`label ${styles.nodePeriod}`}>{item.period}</span>
                  <span className={`display ${styles.nodeCompany}`}>{item.company}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.detailRow}>
            <p className={`display ${styles.counter}`}>
              <span ref={counterRef} className={styles.counterNumber}>
                {String(active + 1).padStart(2, "0")}
              </span>
              <span className={styles.counterTotal}>/ {total}</span>
            </p>
            <div ref={detailRef} className={styles.detail}>
              <p className={`label ${styles.detailRole}`}>
                {job.role}
                {active === jobs.length - 1 && <span className={styles.now}> ● {t.experience.now}</span>}
              </p>
              <p className={styles.detailText}>{job.description}</p>
              <ul className="stack">
                {job.stack.map((tech) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className={`label ${styles.hint}`}>
            {t.experience.scrollHint} <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>

      {/* Lista simples: leitor de tela, sem JS e movimento reduzido */}
      <ol className={styles.list}>
        {t.experience.jobs.map((item) => (
          <li key={item.company} className={styles.job}>
            <p className={`label ${styles.period}`}>{item.period}</p>
            <div>
              <h3 className={`display ${styles.company}`}>{item.company}</h3>
              <p className={`label ${styles.role}`}>{item.role}</p>
              <p className={styles.description}>{item.description}</p>
              <ul className="stack" aria-label={t.stackLabel}>
                {item.stack.map((tech) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
