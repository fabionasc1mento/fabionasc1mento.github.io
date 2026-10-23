"use client";

import { useEffect, useRef } from "react";
import styles from "./AmbientBackground.module.css";

// Fundo da página, desenhado num <canvas> atrás do conteúdo: uma grade
// de engenharia alinhada à página, só em tons de cinza (a cor de destaque fica
// para o conteúdo; no fundo ela pesaria demais).
// O cursor vira uma mira discreta com coordenadas, e as cruzes perto dela
// clareiam um pouco. Só redesenha quando algo muda (mouse, rolagem, tela,
// tema): parado, não gasta nada.

const CELL = 24; // grade fina (px)
const MAJOR = 5; // a cada 5 células, uma linha forte + cruz
const REACH = 190; // alcance do cursor (px)

type Palette = { ink: string; dim: string; dark: boolean };

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let palette: Palette = { ink: "#e3e3e1", dim: "#8f8f8b", dark: true };
    const pointer = { x: -9999, y: -9999, active: false };
    const reticle = { x: -9999, y: -9999 }; // segue o cursor com atraso

    const readTheme = () => {
      const css = getComputedStyle(document.documentElement);
      palette = {
        ink: css.getPropertyValue("--ink").trim() || "#e3e3e1",
        dim: css.getPropertyValue("--dim").trim() || "#8f8f8b",
        dark: document.documentElement.dataset.theme !== "light",
      };
      invalidate();
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      invalidate();
    };

    const rgba = (hex: string, a: number) => {
      const v = hex.replace("#", "");
      const full = v.length === 3 ? v.replace(/./g, (c) => c + c) : v;
      const n = parseInt(full, 16);
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    };

    // 0 longe do cursor, 1 em cima dele (com curva suave)
    const near = (x: number, y: number) => {
      if (!pointer.active) return 0;
      const d = Math.hypot(x - reticle.x, y - reticle.y);
      if (d >= REACH) return 0;
      const f = 1 - d / REACH;
      return f * f;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const offsetY = -(window.scrollY % (CELL * MAJOR));
      const fine = palette.dark ? 0.035 : 0.05;
      const strong = palette.dark ? 0.07 : 0.09;

      // Linhas finas e fortes (a grade acompanha a rolagem)
      ctx.lineWidth = 1;
      for (let i = 0, x = 0.5; x < width; x += CELL, i++) {
        ctx.strokeStyle = rgba(palette.ink, i % MAJOR === 0 ? strong : fine);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      const firstRow = Math.floor(offsetY / CELL) - 1;
      for (let j = firstRow; j * CELL + offsetY < height + CELL; j++) {
        const y = Math.round(j * CELL + offsetY) + 0.5;
        const major = ((j % MAJOR) + MAJOR) % MAJOR === 0;
        ctx.strokeStyle = rgba(palette.ink, major ? strong : fine);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Cruzes nas interseções fortes; perto da mira crescem e clareiam
      const step = CELL * MAJOR;
      for (let x = 0.5; x < width + step; x += step) {
        for (let y = offsetY - step; y < height + step; y += step) {
          const yy = Math.round(y) + 0.5;
          const g = near(x, yy);
          const arm = 3 + g * 3;
          const base = palette.dark ? 0.22 : 0.3;
          ctx.strokeStyle = rgba(palette.ink, base + g * 0.45);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x - arm, yy);
          ctx.lineTo(x + arm, yy);
          ctx.moveTo(x, yy - arm);
          ctx.lineTo(x, yy + arm);
          ctx.stroke();
        }
      }

      // Mira: linhas finas de ponta a ponta + cantos + coordenadas
      if (pointer.active) {
        const rx = Math.round(reticle.x) + 0.5;
        const ry = Math.round(reticle.y) + 0.5;
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(palette.ink, palette.dark ? 0.06 : 0.08);
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.lineTo(width, ry);
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx, height);
        ctx.stroke();

        const s = 16;
        const c = 6;
        ctx.strokeStyle = rgba(palette.ink, palette.dark ? 0.55 : 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          ctx.moveTo(rx + sx * s, ry + sy * (s - c));
          ctx.lineTo(rx + sx * s, ry + sy * s);
          ctx.lineTo(rx + sx * (s - c), ry + sy * s);
        }
        ctx.stroke();

        const docY = Math.round(reticle.y + window.scrollY);
        ctx.font = '700 10px "Space Mono", ui-monospace, monospace';
        ctx.fillStyle = rgba(palette.dim, 0.9);
        ctx.fillText(`X ${String(Math.round(reticle.x)).padStart(4, "0")}  Y ${String(docY).padStart(5, "0")}`, rx + s + 8, ry - s + 4);
      }
    };

    // Laço só enquanto a mira estiver chegando no cursor
    const tick = () => {
      frame = 0;
      let busy = false;
      if (pointer.active) {
        const dx = pointer.x - reticle.x;
        const dy = pointer.y - reticle.y;
        if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
          reticle.x += dx * 0.22;
          reticle.y += dy * 0.22;
          busy = true;
        }
      }
      draw();
      if (busy) frame = requestAnimationFrame(tick);
    };
    function invalidate() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (!pointer.active) {
        reticle.x = event.clientX;
        reticle.y = event.clientY;
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      invalidate();
    };
    const onPointerLeave = () => {
      pointer.active = false;
      invalidate();
    };
    // A grade acompanha a rolagem
    const onScroll = () => invalidate();

    const themeObserver = new MutationObserver(readTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    readTheme();
    resize();
    document.fonts?.ready.then(invalidate);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (!reduce) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div className={styles.ambient} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.grain} />
      <div className={styles.scan} />
    </div>
  );
}
