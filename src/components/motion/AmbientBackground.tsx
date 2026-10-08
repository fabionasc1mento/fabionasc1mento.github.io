"use client";

import { useEffect, useRef } from "react";
import styles from "./AmbientBackground.module.css";

// Fundo vivo, desenhado a cada quadro num <canvas> (nada de imagem em loop):
// 1. duas manchas de tinta violeta, bem suaves, que derivam devagar;
// 2. uma malha de pontos que se afasta do cursor e ondula quando você rola;
// 3. o grão de filme fica no CSS (camada por cima, quase invisível).

const SPACING = 30; // distância entre os pontos da malha (px)
const DOT = 1.1; // raio do ponto (px)
const CURSOR_RADIUS = 140; // alcance do cursor (px)
const CURSOR_PUSH = 14; // quanto o ponto foge do cursor (px)

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(document.documentElement);
    const violet = css.getPropertyValue("--violet").trim() || "#a98bff";
    const dotColor = css.getPropertyValue("--muted").trim() || "#a39cbd";
    const dotFill = hexToRgba(dotColor, 0.24); // calculado uma vez, não por ponto

    let width = 0;
    let height = 0;
    let frame = 0;
    const pointer = { x: -9999, y: -9999, active: false };
    // Energia da onda: sobe quando você rola e vai sumindo sozinha
    let wave = 0;
    let lastScroll = window.scrollY;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (reduceMotion) draw(0);
    };

    const ink = (x: number, y: number, radius: number, alpha: number) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, hexToRgba(violet, alpha));
      gradient.addColorStop(1, hexToRgba(violet, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    const draw = (time: number) => {
      const t = time / 1000;
      ctx.clearRect(0, 0, width, height);

      // 1. Tinta: duas manchas em trajetórias lentas (curvas de Lissajous)
      const big = Math.max(width, height);
      ink(width * (0.25 + 0.15 * Math.sin(t * 0.07)), height * (0.3 + 0.2 * Math.cos(t * 0.05)), big * 0.55, 0.13);
      ink(width * (0.78 + 0.12 * Math.cos(t * 0.06)), height * (0.75 + 0.15 * Math.sin(t * 0.08)), big * 0.45, 0.09);

      // 2. Malha de pontos. A grade acompanha a rolagem (parece presa à página)
      const offsetY = -(window.scrollY % SPACING);
      wave *= 0.94;

      for (let gy = offsetY - SPACING; gy < height + SPACING; gy += SPACING) {
        for (let gx = SPACING / 2; gx < width; gx += SPACING) {
          let x = gx;
          // Onda da rolagem: desloca na horizontal, em faixas que descem
          let y = gy + Math.sin(gx * 0.018 + t * 2.2) * wave;
          let glow = 0;

          if (pointer.active) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist < CURSOR_RADIUS && dist > 0.01) {
              const force = 1 - dist / CURSOR_RADIUS;
              const eased = force * force;
              x += (dx / dist) * CURSOR_PUSH * eased;
              y += (dy / dist) * CURSOR_PUSH * eased;
              glow = eased;
            }
          }

          ctx.beginPath();
          ctx.arc(x, y, DOT + glow * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = glow > 0.02 ? hexToRgba(violet, 0.25 + glow * 0.5) : dotFill;
          ctx.fill();
        }
      }
    };

    const loop = (time: number) => {
      const current = window.scrollY;
      const delta = current - lastScroll;
      lastScroll = current;
      wave = Math.min(9, wave + Math.abs(delta) * 0.06);
      draw(time);
      frame = requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };

    resize();
    window.addEventListener("resize", resize);

    if (!reduceMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
      frame = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div className={styles.ambient} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.grain} />
    </div>
  );
}

// "#a98bff" + 0.3 -> "rgba(169, 139, 255, 0.3)"
function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
