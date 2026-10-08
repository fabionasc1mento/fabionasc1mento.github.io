"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./ExtractionDemo.module.css";

// Lotes fictícios, no formato dos catálogos que o extrator lê.
const LOTS = [
  {
    number: "0001.000127-4",
    before: " / UM ANEL, DOIS BRINCOS, DE: OURO; CONSTAM: amassada(s), PESO LOTE: ",
    weight: "7,15",
    after: "G (SETE GRAMAS E QUINZE CENTIGRAMAS) R$ 2.455,00",
  },
  {
    number: "0001.000131-2",
    before: " / UM COLAR, UM PENDENTE, DE: OURO; PESO LOTE: ",
    weight: "12,40",
    after: "G (DOZE GRAMAS E QUARENTA CENTIGRAMAS) R$ 4.260,00",
  },
  {
    number: "0001.000136-3",
    before: " / DUAS ALIANÇAS, DE: OURO; CONSTAM: inscrições, PESO LOTE: ",
    weight: "4,05",
    after: "G (QUATRO GRAMAS E CINCO CENTIGRAMAS) R$ 1.390,00",
  },
];

// Cada lote tem 2 passos: marcar no documento e depois aparecer na tabela.
const LAST_STEP = LOTS.length * 2;
const STEP_MS = 650;
const START_DELAY_MS = 700;

export function ExtractionDemo() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);

    // Quem pediu menos movimento no sistema vê o resultado final direto
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(LAST_STEP);
      return;
    }

    setStep(0);
    const advance = (next: number) => {
      setStep(next);
      if (next < LAST_STEP) timer.current = setTimeout(() => advance(next + 1), STEP_MS);
    };
    timer.current = setTimeout(() => advance(1), START_DELAY_MS);
  }, []);

  // Só começa quando a demonstração aparece na tela (no celular ela fica
  // abaixo da dobra, e a animação terminaria antes de alguém ver).
  const figure = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = figure.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [run]);

  const isMarked = (i: number) => step >= i * 2 + 1;
  const isExtracted = (i: number) => step >= i * 2 + 2;

  return (
    <figure ref={figure} className={styles.demo}>
      <div className={styles.doc} aria-hidden="true">
        <span className={styles.fileName}>catalogo.pdf</span>
        {LOTS.map((lot, i) => (
          <p key={lot.number} className={styles.docLine}>
            <mark className={styles.marker} data-on={isMarked(i)}>
              {lot.number}
            </mark>
            {lot.before}
            <mark className={styles.marker} data-on={isMarked(i)}>
              {lot.weight}
            </mark>
            {lot.after}
          </p>
        ))}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t.hero.demoColumns[0]}</th>
            <th scope="col">{t.hero.demoColumns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {LOTS.map((lot, i) => (
            <tr key={lot.number} className={styles.row} data-on={isExtracted(i)}>
              <td>{lot.number}</td>
              <td>{lot.weight}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <figcaption className={styles.caption}>
        <span>{t.hero.demoCaption}</span>
        <button type="button" className={styles.replay} onClick={run} disabled={step < LAST_STEP}>
          {t.hero.demoReplay}
        </button>
      </figcaption>
    </figure>
  );
}
