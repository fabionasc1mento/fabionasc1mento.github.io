"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useLanguage } from "@/i18n/LanguageProvider";
import { sound } from "@/sound/engine";
import styles from "./Manifesto.module.css";

// Manifesto: a apresentação em letras grandes, "digitada" pela rolagem.
// Descendo, as letras aparecem uma a uma com um cursor de terminal na
// ponta; subindo, são apagadas na ordem inversa. Todas as letras já ocupam
// o lugar delas desde o início (só ficam invisíveis), então o texto não
// pula de linha enquanto é digitado.
// As letras são separadas pelo React: a troca de idioma re-renderiza o
// texto sem brigar com o DOM. Leitor de tela lê a frase inteira uma vez
// (cópia escondida), não as letras soltas.
export function Manifesto() {
  const { t } = useLanguage();
  const ref = useRef<HTMLElement>(null);
  const text = t.hero.lead;

  useEffect(() => {
    const section = ref.current;
    const box = section?.querySelector<HTMLElement>("[data-manifesto-text]");
    if (!section || !box) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const chars = Array.from(box.querySelectorAll<HTMLElement>("[data-char]"));
    let shown = -1;
    let idle: ReturnType<typeof setTimeout> | undefined;

    // Mostra as n primeiras letras e põe o cursor depois da última
    const type = (n: number) => {
      if (n === shown) return;
      // Som de tecla; apagando (rolando para cima) soa mais grave
      if (shown >= 0) sound.key(n < shown);
      const from = Math.max(0, Math.min(n, shown));
      const to = Math.max(n, shown);
      for (let i = from; i < to; i++) chars[i].dataset.on = String(i < n);
      chars[Math.max(shown, 0) - 1]?.removeAttribute("data-caret");
      if (n > 0) chars[n - 1].dataset.caret = "";
      box.dataset.empty = String(n === 0);
      shown = n;
      // Cursor fica aceso enquanto digita e pisca quando a rolagem para
      box.dataset.typing = "true";
      clearTimeout(idle);
      idle = setTimeout(() => (box.dataset.typing = "false"), 450);
    };

    type(0);
    const state = { p: 0 };
    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: { trigger: box, start: "top 82%", end: "bottom 70%", scrub: 0.3 },
        })
        .to(state, {
          p: 1,
          duration: 1,
          ease: "none",
          onUpdate: () => type(Math.round(state.p * chars.length)),
        }, 0)
        // Barra de leitura: acompanha a digitação e termina junto com ela
        .fromTo("[data-manifesto-bar]", { scaleX: 0 }, { scaleX: 1, ease: "none", duration: 1 }, 0);
    }, section);

    return () => {
      clearTimeout(idle);
      ctx.revert();
      chars.forEach((c) => {
        c.removeAttribute("data-on");
        c.removeAttribute("data-caret");
      });
    };
  }, [text]);

  // Destaca trechos inteiros ("de ponta a ponta"), ignorando pontuação
  const words = text.split(" ").map((word) => ({ word, hot: false }));
  const bare = words.map(({ word }) => word.replace(/[.,;:]+$/, "").toLowerCase());
  t.manifesto.highlight.forEach((phrase) => {
    const parts = phrase.toLowerCase().split(" ");
    for (let i = 0; i + parts.length <= bare.length; i++) {
      if (parts.every((part, k) => bare[i + k] === part)) {
        for (let k = 0; k < parts.length; k++) words[i + k].hot = true;
      }
    }
  });

  return (
    <section
      ref={ref}
      className={`container frame ${styles.manifesto}`}
      aria-labelledby="manifesto-label"
      data-floating-show=""
    >
      <p id="manifesto-label" className={`label tarja ${styles.label}`}>
        <span className="ast" aria-hidden="true">
          ✱{" "}
        </span>
        {t.manifesto.label}
      </p>
      <p className={styles.text} data-manifesto-text="" data-empty="true">
        <span className="visually-hidden">{text}</span>
        {words.map(({ word, hot }, i) => (
          <span key={`${text}-${i}`} aria-hidden="true">
            {/* A palavra não quebra no meio; cada letra é uma "tecla" */}
            <span className={styles.word} data-hot={hot}>
              {Array.from(word).map((char, j) => (
                <span key={j} className={styles.char} data-char="">
                  {char}
                </span>
              ))}
            </span>
            {i < words.length - 1 && (
              <span className={styles.char} data-char="">
                {" "}
              </span>
            )}
          </span>
        ))}
      </p>
      <span className={styles.bar} data-manifesto-bar="" aria-hidden="true" />
    </section>
  );
}
