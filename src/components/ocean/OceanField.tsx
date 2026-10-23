"use client";

import { useEffect, useRef } from "react";
import { Grid, World } from "./world";
import { MAIN, VERTEX, WAVE } from "./shaders";
import { sound } from "@/sound/engine";
import styles from "./OceanField.module.css";

// Oceano do fundo: tubarões e cardumes em ASCII nadando atrás da página, e
// água de verdade por cima. O mouse perturba a superfície; as ondas se
// espalham, batem, somem, e entortam os caracteres por baixo (refração).
//
// Divisão do trabalho:
// - world.ts (o "modelo"): move os bichos e desenha numa grade de células;
// - este componente (a "view"): roda a física da água na placa de vídeo,
//   transforma a grade em caracteres e cuida de mouse, tema e tamanho.
//
// Pausa com a aba escondida. Com "movimento reduzido" no sistema, mostra
// uma cena parada, sem ondas.

const CELL_W = 10;
const CELL_H = 13;
const FONT_PX = 12;
const VARIANTS = 3;
// Do mais leve (borda do corpo) ao mais denso (dorso)
const RAMP = [
  ["'", ".", "`"],
  [":", ";", "'"],
  [";", "t", ":"],
  ["t", "%", "i"],
  ["%", "t", "S"],
  ["S", "%", "X"],
  ["X", "S", "8"],
  ["8", "X", "@"],
  ["@", "#", "8"],
];
const TICK = 1 / 60; // física em passos fixos: igual em 60 Hz ou 120 Hz
const WAVE_SCALE = 3; // 1 texel da água = 3 px de tela
const WAVE_STEPS = 2; // passos da água por passo da física (velocidade da onda)

type OceanFieldProps = {
  /** opacidade geral do desenho (0 a 1) */
  amount?: number;
};

export function OceanField({ amount = 0.5 }: OceanFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!canvas || !gl) return;

    // ---------- programas ----------
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const link = (fragment: string) => {
      const program = gl.createProgram()!;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
    };
    const main = link(MAIN);
    if (!main) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wave = reduce ? null : link(WAVE);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const locations = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
    const use = (program: WebGLProgram) => {
      gl.useProgram(program);
      const aPos = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      if (!locations.has(program)) locations.set(program, new Map());
      const cache = locations.get(program)!;
      return (name: string) => {
        if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));
        return cache.get(name)!;
      };
    };

    const texture = (filter: number) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };

    // ---------- modelo ----------
    const world = new World();
    const grid = new Grid(CELL_W, CELL_H);
    const dataTexture = texture(gl.NEAREST);
    const atlasTexture = texture(gl.LINEAR);

    // ---------- água ----------
    const half = gl.getExtension("OES_texture_half_float");
    const halfLinear = gl.getExtension("OES_texture_half_float_linear");
    gl.getExtension("EXT_color_buffer_half_float");
    let waveOn = false;
    let waveSize = { w: 1, h: 1 };
    let waveTextures: WebGLTexture[] = [];
    let waveRead = 0;
    const fbo = wave && half ? gl.createFramebuffer() : null;

    const setupWave = (cssW: number, cssH: number) => {
      if (!wave || !half || !fbo) return;
      waveTextures.forEach((t) => gl.deleteTexture(t));
      waveSize = { w: Math.max(2, Math.ceil(cssW / WAVE_SCALE)), h: Math.max(2, Math.ceil(cssH / WAVE_SCALE)) };
      waveTextures = [0, 1].map(() => {
        const t = texture(halfLinear ? gl.LINEAR : gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, waveSize.w, waveSize.h, 0, gl.RGBA, half.HALF_FLOAT_OES, null);
        return t;
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      waveOn = true;
      for (const t of waveTextures) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) waveOn = false;
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    // Mouse: posição em px de tela e velocidade suavizada
    const mouse = { x: 0, y: 0, speed: 0, inside: false, splatX: 0, splatY: 0 };
    const drops: number[][] = []; // cliques pendentes: x, y (px de tela), força

    const toWave = (x: number, y: number, cssW: number, cssH: number) => [
      (x / cssW) * waveSize.w,
      (1 - y / cssH) * waveSize.h,
    ];

    const dropData = new Float32Array(16); // reaproveitados: nada de lixo por quadro
    const noDrops = new Float32Array(16);
    const stepWave = (ax: number, ay: number, bx: number, by: number, strength: number, cssW: number, cssH: number) => {
      if (!waveOn || !wave || !fbo) return;
      const u = use(wave);
      const [wax, way] = toWave(ax, ay, cssW, cssH);
      const [wbx, wby] = toWave(bx, by, cssW, cssH);
      // Gotas: clique (forte) e o focinho dos tubarões (bem leve)
      dropData.fill(0);
      let n = 0;
      const click = drops.shift();
      if (click) {
        const [cx, cy] = toWave(click[0], click[1], cssW, cssH);
        dropData.set([cx, cy, 6, click[2]], n++ * 4);
      }
      for (const shark of world.sharks) {
        if (n >= 4) break;
        const [sx, sy] = toWave(shark.x, shark.y, cssW, cssH);
        dropData.set([sx, sy, 2.2, 0.006 * shark.depth * (shark.speed / shark.cruise)], n++ * 4);
      }
      gl.uniform4fv(u("uDrops"), dropData);
      gl.uniform2f(u("uTexel"), 1 / waveSize.w, 1 / waveSize.h);
      gl.uniform2f(u("uA"), wax, way);
      gl.uniform2f(u("uB"), wbx, wby);
      gl.uniform1f(u("uStrength"), strength);
      gl.uniform1f(u("uRadius"), 2.6);
      gl.uniform1f(u("uDamping"), 0.988);
      gl.uniform1i(u("uState"), 0);
      gl.viewport(0, 0, waveSize.w, waveSize.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      for (let i = 0; i < WAVE_STEPS; i++) {
        const write = 1 - waveRead;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, waveTextures[write], 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, waveTextures[waveRead]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        waveRead = write;
        // Só o primeiro sub-passo recebe o empurrão e as gotas
        if (i === 0) {
          gl.uniform1f(u("uStrength"), 0);
          gl.uniform4fv(u("uDrops"), noDrops);
        }
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    // ---------- atlas de caracteres ----------
    let dpr = 1;
    const buildAtlas = () => {
      const cw = Math.round(CELL_W * dpr);
      const ch = Math.round(CELL_H * dpr);
      const atlas = document.createElement("canvas");
      atlas.width = cw * VARIANTS;
      atlas.height = ch * RAMP.length;
      const ctx = atlas.getContext("2d")!;
      const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "monospace";
      ctx.font = `600 ${Math.round(FONT_PX * dpr)}px ${mono}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      RAMP.forEach((row, level) =>
        row.forEach((glyph, variant) => ctx.fillText(glyph, variant * cw + cw / 2, level * ch + ch / 2 + dpr)),
      );
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    };

    // ---------- cores do tema ----------
    const color = (name: string, fallback: string) => {
      const hex = (getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback).replace("#", "");
      const n = parseInt(hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex, 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
    };
    let ink = color("--ink", "#e3e3e1");
    let accent = color("--accent", "#6d8bff");
    const readTheme = () => {
      ink = color("--ink", "#e3e3e1");
      accent = color("--accent", "#6d8bff");
    };

    // ---------- tamanho ----------
    let cssW = 1;
    let cssH = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, rect.width);
      cssH = Math.max(1, rect.height);
      const nextDpr = Math.min(window.devicePixelRatio || 1, cssW < 760 ? 1.5 : 2);
      const dprChanged = nextDpr !== dpr;
      dpr = nextDpr;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      // Painel lateral fixo (telas largas) cobre a direita: os bichos ficam
      // na área que dá para ver
      const panel = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
      world.resize(cssW, cssH, cssW - panel);
      grid.resize(cssW, cssH);
      gl.bindTexture(gl.TEXTURE_2D, dataTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, grid.cols, grid.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      setupWave(cssW, cssH);
      if (dprChanged) buildAtlas();
    };

    // ---------- desenho ----------
    const render = () => {
      world.draw(grid);
      gl.bindTexture(gl.TEXTURE_2D, dataTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, grid.cols, grid.rows, gl.RGBA, gl.UNSIGNED_BYTE, grid.pack());

      const u = use(main);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dataTexture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, waveOn ? waveTextures[waveRead] : null);
      gl.uniform1i(u("uData"), 0);
      gl.uniform1i(u("uAtlas"), 1);
      gl.uniform1i(u("uWave"), 2);
      gl.uniform2f(u("uRes"), canvas.width, canvas.height);
      gl.uniform1f(u("uDpr"), dpr);
      gl.uniform2f(u("uCell"), CELL_W, CELL_H);
      gl.uniform2f(u("uGrid"), grid.cols, grid.rows);
      gl.uniform2f(u("uAtlasGrid"), VARIANTS, RAMP.length);
      gl.uniform2f(u("uWaveTexel"), 1 / waveSize.w, 1 / waveSize.h);
      gl.uniform1f(u("uWaveOn"), waveOn ? 1 : 0);
      gl.uniform1f(u("uRefract"), 26);
      gl.uniform1f(u("uShine"), 5);
      gl.uniform3f(u("uInk"), ink[0], ink[1], ink[2]);
      gl.uniform3f(u("uAccent"), accent[0], accent[1], accent[2]);
      gl.uniform1f(u("uAmount"), amount);
      gl.uniform1f(u("uTime"), world.time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
    };

    // ---------- laço ----------
    let frame = 0;
    let last = 0;
    let acc = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = last ? Math.min(0.1, (now - last) / 1000) : TICK;
      last = now;
      acc += dt;
      // Velocidade do mouse medida por quadro (distância ÷ tempo), não por
      // evento: não depende de quantos eventos o mouse manda por segundo
      const moved = Math.hypot(mouse.x - mouse.splatX, mouse.y - mouse.splatY);
      const measured = mouse.inside && dt > 0 ? Math.min(moved / dt, 4000) : 0;
      mouse.speed += (measured - mouse.speed) * (1 - Math.exp(-dt * 14));
      world.pointer = { x: mouse.x, y: mouse.y, speed: mouse.speed, active: mouse.inside };

      const ticks = Math.min(4, Math.floor(acc / TICK));
      acc -= ticks * TICK;
      if (ticks === 4) acc = 0;
      // O caminho do mouse desde o último quadro é dividido entre os passos
      const fromX = mouse.splatX;
      const fromY = mouse.splatY;
      // Mexer devagar já ondula; mais rápido, onda mais forte
      const strength = mouse.inside && moved > 0.5 ? 0.1 + Math.min(1, mouse.speed / 1000) * 0.5 : 0;
      for (let i = 0; i < ticks; i++) {
        world.step(TICK);
        const a = i / ticks;
        const b = (i + 1) / ticks;
        stepWave(
          fromX + (mouse.x - fromX) * a,
          fromY + (mouse.y - fromY) * a,
          fromX + (mouse.x - fromX) * b,
          fromY + (mouse.y - fromY) * b,
          strength,
          cssW,
          cssH,
        );
      }
      if (ticks > 0) {
        mouse.splatX = mouse.x;
        mouse.splatY = mouse.y;
      }
      render();
    };

    const start = () => {
      if (reduce || frame) return;
      last = 0;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    // ---------- eventos ----------
    const onPointerMove = (event: PointerEvent) => {
      const x = event.clientX;
      const y = event.clientY;
      if (!mouse.inside) {
        mouse.inside = true;
        mouse.splatX = x;
        mouse.splatY = y;
      }
      mouse.x = x;
      mouse.y = y;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (drops.length < 3) drops.push([event.clientX, event.clientY, 0.9]);
      // Clicou em botão ou link: o som é o do clique, não o da gota
      if (!(event.target as Element | null)?.closest?.("a, button")) sound.drop(event.clientX);
    };
    const onPointerLeave = () => {
      mouse.inside = false;
      mouse.speed = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const themeObserver = new MutationObserver(() => {
      readTheme();
      if (reduce) render();
    });
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduce) render();
    });

    gl.disable(gl.BLEND);
    resize();
    buildAtlas();
    // O canvas não dispara o carregamento da fonte: espera ela chegar e refaz
    document.fonts?.ready.then(() => {
      buildAtlas();
      if (reduce) render();
    });
    if (reduce) {
      for (let i = 0; i < 240; i++) world.step(TICK); // pose natural, parada
      render();
    } else {
      start();
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("blur", onPointerLeave);
    }
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      themeObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      waveTextures.forEach((t) => gl.deleteTexture(t));
      gl.deleteTexture(dataTexture);
      gl.deleteTexture(atlasTexture);
      if (fbo) gl.deleteFramebuffer(fbo);
    };
  }, [amount]);

  return <canvas ref={canvasRef} className={styles.ocean} aria-hidden="true" />;
}
