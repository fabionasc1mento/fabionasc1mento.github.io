"use client";

import { useEffect, useState } from "react";
import styles from "./BootScreen.module.css";

// Linhas de "terminal" digitadas na abertura. São só decoração (comandos),
// não informação, por isso ficam iguais nos dois idiomas.
const LINES = [
  { prompt: "$", text: "ssh visitor@fabionasc1mento.github.io" },
  { prompt: "", text: "connecting... access granted" },
  { prompt: ">", text: "./portfolio --mode=cybercore" },
];

const CHAR_MS = 12;
const LINE_GAP_MS = 110;
const SESSION_KEY = "boot-seen";

// Tela de abertura: terminal preto que digita três linhas, pisca em
// vermelho e sobe como uma cortina. Aparece uma vez por sessão; clicar,
// rolar ou apertar uma tecla pula. Quem pediu menos movimento não vê.
export function BootScreen() {
  const [state, setState] = useState<"off" | "typing" | "leaving">("off");
  const [typed, setTyped] = useState<string[]>(["", "", ""]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sem sessionStorage, mostra mesmo assim
    }

    setState("typing");
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 120;
    LINES.forEach((line, li) => {
      for (let c = 1; c <= line.text.length; c++) {
        timers.push(
          setTimeout(() => {
            setTyped((prev) => prev.map((v, i) => (i === li ? line.text.slice(0, c) : v)));
          }, elapsed),
        );
        elapsed += CHAR_MS;
      }
      elapsed += LINE_GAP_MS;
    });

    const leave = () => {
      timers.forEach(clearTimeout);
      setTyped(LINES.map((l) => l.text));
      setState("leaving");
      timers.push(setTimeout(() => setState("off"), 900));
    };
    timers.push(setTimeout(leave, elapsed + 180));

    const skip = () => leave();
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    window.addEventListener("wheel", skip, { once: true, passive: true });
    window.addEventListener("touchstart", skip, { once: true, passive: true });

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
    };
  }, []);

  if (state === "off") return null;

  return (
    <div className={styles.boot} data-state={state} aria-hidden="true">
      <div className={styles.term}>
        {LINES.map((line, i) => (
          <p key={i} className={i === 1 ? styles.dim : undefined}>
            {line.prompt && typed[i].length > 0 && <span className={styles.prompt}>{line.prompt} </span>}
            {typed[i]}
            {typed[i].length > 0 && typed[i].length < line.text.length && <span className="cursor" />}
          </p>
        ))}
      </div>
      <div className={styles.flash} />
    </div>
  );
}
