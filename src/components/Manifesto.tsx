"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./Manifesto.module.css";

// Manifesto: a apresentação em letras grandes, que "acende" palavra por
// palavra conforme a rolagem (padrão "words light up" do landing-motion).
// As palavras são separadas pelo React, e não pelo runtime: assim a troca
// de idioma re-renderiza o texto sem brigar com o DOM. Leitor de tela lê a
// frase inteira uma vez (cópia escondida), não as palavras soltas.
export function Manifesto() {
  const { t } = useLanguage();
  const ref = useRef<HTMLElement>(null);
  const text = t.hero.lead;
  const highlight = new Set(t.manifesto.highlight);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const scrollTrigger = {
        trigger: "[data-manifesto-text]",
        start: "top 80%",
        end: "bottom 45%",
        scrub: 0.5,
      };
      gsap
        .timeline({ scrollTrigger })
        .fromTo("[data-word]", { opacity: 0.12 }, { opacity: 1, duration: 1, stagger: 0.12, ease: "none" }, 0)
        // Barra de leitura: acompanha as palavras e termina junto com elas
        .fromTo("[data-manifesto-bar]", { scaleX: 0 }, { scaleX: 1, ease: "none", duration: 1 }, 0);
    }, section);

    return () => ctx.revert();
  }, [text]);

  // "C#," -> destaca "C#" e mantém a vírgula
  const words = text.split(" ").map((word) => {
    const bare = word.replace(/[.,;:]+$/, "");
    return { word, hot: highlight.has(bare) };
  });

  return (
    <section
      ref={ref}
      className={`container frame ${styles.manifesto}`}
      aria-labelledby="manifesto-label"
      data-floating-show=""
    >
      <p id="manifesto-label" className={`label ${styles.label}`}>
        <span className="ast" aria-hidden="true">
          ✱{" "}
        </span>
        {t.manifesto.label}
      </p>
      <p className={styles.text} data-manifesto-text="">
        <span className="visually-hidden">{text}</span>
        {words.map(({ word, hot }, i) => (
          <span key={`${text}-${i}`} aria-hidden="true">
            <span className={styles.word} data-word="" data-hot={hot}>
              {word}
            </span>{" "}
          </span>
        ))}
      </p>
      <span className={styles.bar} data-manifesto-bar="" aria-hidden="true" />
    </section>
  );
}
