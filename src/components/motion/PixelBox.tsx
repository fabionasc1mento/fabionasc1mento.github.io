"use client";

import { useEffect, useRef } from "react";
import styles from "./PixelBox.module.css";

// Padrão inicial fixo (igual no servidor e no navegador, sem "pular")
const PATTERN =
  "1100110011101011010001101101100110011101000110110011011100100110111001101101001110110010110011001101";

// Caixa de 10x10 "pixels" que piscam aos poucos, como ruído de tela.
export function PixelBox({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cells = ref.current?.children;
    if (!cells) return;
    const timer = setInterval(() => {
      for (let k = 0; k < 6; k++) {
        const cell = cells[Math.floor(Math.random() * cells.length)] as HTMLElement;
        cell.dataset.on = cell.dataset.on === "true" ? "false" : "true";
      }
    }, 160);
    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={ref} className={`${styles.box} ${className ?? ""}`} aria-hidden="true">
      {Array.from(PATTERN, (bit, i) => (
        <i key={i} data-on={bit === "1"} />
      ))}
    </div>
  );
}
