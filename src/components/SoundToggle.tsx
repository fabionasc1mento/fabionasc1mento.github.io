"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { sound, SOUND_EVENT } from "@/sound/engine";
import styles from "./ThemeToggle.module.css";

// Botão de som no cabeçalho, ao lado do tema. Mostra alto-falante com
// ondas (ligado) ou cortado (desligado). Ligar acontece dentro do clique,
// que é o gesto que o navegador exige para liberar áudio.
export function SoundToggle({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(sound.enabled || sound.pref === "on");
    sync();
    window.addEventListener(SOUND_EVENT, sync);
    return () => window.removeEventListener(SOUND_EVENT, sync);
  }, []);

  const toggle = () => {
    if (sound.enabled) {
      sound.toggle(false);
      // deixa o bipe de "desligar" terminar antes de silenciar
      setOn(false);
      window.setTimeout(() => sound.disable(), 160);
    } else {
      sound.enable();
      sound.toggle(true);
    }
  };

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className ?? ""}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? t.sound.turnOff : t.sound.turnOn}
      data-sound="off"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" />
        {on ? (
          <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6 6 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.4" />
        ) : (
          <path d="M11 6l4 4M15 6l-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        )}
      </svg>
    </button>
  );
}
