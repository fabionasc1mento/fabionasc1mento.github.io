"use client";

import { useEffect } from "react";
import { sound } from "@/sound/engine";

// Liga os sons genéricos da página inteira, sem mexer em cada componente:
// - hover (só mouse) em links e botões: gota;
// - clique em links e botões: tique de terminal;
// elementos com data-sound="off" tocam o próprio som (ou nenhum).
// Também pausa o áudio com a aba escondida e, para quem já escolheu "com
// som" numa visita anterior, liga no primeiro clique/tecla (o navegador não
// deixa tocar antes de um gesto).
const INTERACTIVE = 'a[href], button, [role="button"], summary, label[for]';

export function SoundRoot() {
  useEffect(() => {
    let hovered: Element | null = null;

    const target = (event: Event) => {
      const el = (event.target as Element | null)?.closest?.(INTERACTIVE) ?? null;
      if (!el || el.closest('[data-sound="off"]') || (el as HTMLButtonElement).disabled) return null;
      return el;
    };

    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const el = target(event);
      if (el && el !== hovered) sound.hover(event.clientX);
      hovered = el;
    };
    const onClick = (event: MouseEvent) => {
      if (target(event)) sound.click(event.clientX || undefined);
    };
    const onVisibility = () => (document.hidden ? sound.pause() : sound.resume());

    // Escolheu "com som" antes: liga no primeiro gesto desta visita
    const unlock = () => {
      if (sound.pref === "on" && !sound.enabled) sound.enable(false);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    if (sound.pref === "on") {
      window.addEventListener("pointerdown", unlock, true);
      window.addEventListener("keydown", unlock, true);
    }

    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);

  return null;
}
