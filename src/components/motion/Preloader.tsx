"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { sound } from "@/sound/engine";
import { Mark } from "../Mark";
import styles from "./Preloader.module.css";

// Linhas de "boot" no canto: decoração em forma de comando, iguais nos
// dois idiomas.
const LOG = [
  "$ ssh visitor@fabionasc1mento.github.io",
  "connecting... access granted",
  "> ./portfolio --mode=cybercore",
];

// Evento que libera a saída do preloader (data-hold-until no runtime)
const CHOICE_EVENT = "lm:sound-choice";

// Abertura encenada (landing-motion, preloader "staged"): só começa depois
// que a página carregou; uma cortina preta recua da esquerda para a direita
// revelando o painel azul, com paradas em 30% e 60%, e o contador é
// empurrado para fora pela borda. Uma vez por sessão (script do <head>).
//
// Som: se a pessoa nunca escolheu, a abertura para no fim e pergunta
// "entrar com som?". O clique na resposta é o gesto que o navegador exige
// para liberar áudio. Quem já escolheu antes passa direto.
export function Preloader() {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || sound.pref) return;
    el.setAttribute("data-hold-until", CHOICE_EVENT);
    // Quando a abertura para e pergunta, o foco vai para a resposta
    const onHold = () => firstButton.current?.focus({ preventScroll: true });
    el.addEventListener("lm:hold", onHold);
    return () => el.removeEventListener("lm:hold", onHold);
  }, []);

  const choose = (on: boolean) => {
    if (on) {
      sound.enable();
      sound.boot();
    } else {
      sound.disable();
    }
    window.dispatchEvent(new Event(CHOICE_EVENT));
  };

  return (
    <div
      ref={ref}
      className={styles.preloader}
      data-preloader="staged"
      data-stops="30,60"
      data-holds="0.16,0.2"
      data-durations="0.6,0.62,1.25"
      data-overshoot="0.28"
      data-hold-end="0.35"
      data-exit-duration="1.05"
      data-max="7000"
    >
      <div className={styles.brand} data-preloader-split="">
        <Mark className={styles.mark} weight={3} />

        {/* Pergunta do som: escondida até a abertura parar no fim */}
        <div className={styles.choice} role="group" aria-label={t.sound.question}>
          <p className={`label ${styles.question}`}>{t.sound.question}</p>
          <div className={styles.answers}>
            <button
              ref={firstButton}
              type="button"
              className={`label ${styles.answer} ${styles.primary}`}
              data-sound="off"
              onClick={() => choose(true)}
            >
              {t.sound.withSound}
            </button>
            <button type="button" className={`label ${styles.answer}`} data-sound="off" onClick={() => choose(false)}>
              {t.sound.withoutSound}
            </button>
          </div>
          <p className={`label ${styles.hint}`}>{t.sound.hint}</p>
        </div>
      </div>

      <div className={`label ${styles.log}`} aria-hidden="true">
        {LOG.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div data-preloader-curtain="" aria-hidden="true" />
      <span className={styles.rider} data-preloader-rider="" aria-hidden="true" />
      <span className={`display ${styles.count}`} data-preloader-count="" aria-hidden="true">
        0
      </span>
    </div>
  );
}
