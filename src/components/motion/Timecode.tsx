"use client";

import { useEffect, useRef } from "react";

// Timecode de vídeo (hh:mm:ss:quadros) contando desde que a página abriu.
// Atualiza o texto direto no DOM, sem re-renderizar o React.
export function Timecode({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    let last = -1;
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = (now: number) => {
      const frames = Math.floor(((now - start) / 1000) * 30);
      if (frames !== last && ref.current) {
        last = frames;
        const s = Math.floor(frames / 30);
        ref.current.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frames % 30)}`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <span ref={ref} className={className} aria-hidden="true">
      00:00:00:00
    </span>
  );
}
