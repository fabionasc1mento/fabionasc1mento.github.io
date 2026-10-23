"use client";

import { useEffect, useRef } from "react";
import styles from "./DitherField.module.css";

// Fumaça em dithering 1-bit (estilo computador antigo), desenhada na placa
// de vídeo com um shader WebGL pequeno, sem biblioteca:
// 1. ruído fractal com "domain warping" (o ruído distorce a si mesmo e vira
//    fumaça líquida);
// 2. dithering Bayer 8×8: cada pixel vira ligado/desligado, e o tom vem da
//    densidade de pixels ligados;
// 3. desenhado em resolução reduzida e ampliado com pixels duros.
// Com interactive, a fumaça gira em volta do mouse e o rastro some devagar.
// Pausa com a aba escondida e fica parado com movimento reduzido.

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform vec3 uInk;
uniform float uAmount;
uniform float uScale;
// Rastro do mouse: até 8 pontos (x, y em px do canvas; z = força 0..1)
uniform vec3 uTrail[8];
uniform float uReach;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  // Poucas oitavas: formas grandes e lisas, como fumaça (não granulado)
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = rot * p * 2.02; a *= 0.5; }
  return v;
}
// Bayer 8x8 sem operações de bits (WebGL 1)
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 frag = gl_FragCoord.xy;
  // O mouse "mexe" a fumaça: cada ponto do rastro gira o espaço em volta
  // dele (redemoinho) e os mais recentes giram mais. O dithering continua
  // usando a grade original de pixels (frag), só o desenho se distorce.
  vec2 c = frag;
  float stir = 0.0;
  for (int i = 0; i < 8; i++) {
    vec3 m = uTrail[i];
    if (m.z <= 0.001) continue;
    vec2 rel = c - m.xy;
    float fall = exp(-dot(rel, rel) / (uReach * uReach)) * m.z;
    float ang = fall * 1.8;
    float s = sin(ang), co = cos(ang);
    c = m.xy + mat2(co, s, -s, co) * rel;
    stir += fall;
  }
  vec2 p = vec2(c.x, c.y - uScroll) / uScale;
  float t = uTime;
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05)), fbm(p + vec2(5.2, 1.3) - t * 0.04));
  vec2 r = vec2(fbm(p + 5.0 * q + vec2(1.7, 9.2) + t * 0.07), fbm(p + 5.0 * q + vec2(8.3, 2.8) - t * 0.05));
  float f = fbm(p + 5.0 * r);
  // Formas preenchidas em cinza (degradê pelo dithering), borda um pouco
  // mais clara e vazios pretos: o desenho da referência
  float edge = 1.0 - smoothstep(0.0, 0.06, abs(f - 0.47));
  float v = smoothstep(0.42, 0.64, f) * 0.55 + edge * 0.2 + smoothstep(0.64, 0.86, f) * 0.25;
  // Onde o mouse mexeu, a fumaça fica um pouco mais densa
  v += min(stir, 1.0) * 0.18 * smoothstep(0.3, 0.6, f);
  float bit = step(bayer8(frag) + 0.001, v);
  float a = bit * uAmount;
  gl_FragColor = vec4(uInk * a, a);
}
`;

type DitherFieldProps = {
  /** intensidade dos pixels ligados (0 a 1) */
  amount?: number;
  /** velocidade do fluxo (1 = como a referência) */
  speed?: number;
  /** tamanho do padrão: maior = fumaça maior */
  scale?: number;
  /** tamanho do pixel do dithering, em px de tela */
  pixel?: number;
  /** fixo atrás da página inteira (true) ou dentro do bloco pai (false) */
  fixed?: boolean;
  /** cor dos pixels: variável CSS lida do tema */
  colorVar?: string;
  /** a fumaça reage ao mouse (só faz sentido no fundo fixo) */
  interactive?: boolean;
  className?: string;
};

export function DitherField({
  amount = 0.1,
  speed = 0.25,
  scale = 140,
  pixel = 2,
  fixed = false,
  colorVar = "--ink",
  interactive = false,
  className,
}: DitherFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { premultipliedAlpha: true, antialias: false });
    if (!canvas || !gl) return;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uScroll = u("uScroll");
    const uInk = u("uInk");
    const uAmount = u("uAmount");
    const uScale = u("uScale");
    const uTrail = u("uTrail");
    const uReach = u("uReach");
    // Rastro do mouse em px do canvas: [x, y, força] × 8
    const TRAIL = 8;
    const trail = new Float32Array(TRAIL * 3);
    const pointer = { x: 0, y: 0, moved: false };
    let lastPush = 0;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = 0;
    let time = 7.3; // começa num ponto bonito do fluxo

    const readInk = () => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim() || "#e3e3e1";
      const hex = value.replace("#", "");
      const n = parseInt(hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex, 16);
      gl.uniform3f(uInk, ((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width / pixel));
      canvas.height = Math.max(1, Math.round(rect.height / pixel));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uScale, scale / pixel);
      gl.uniform1f(uReach, 110 / pixel);
    };

    // Um ponto novo no rastro a cada ~60ms de movimento; todos vão perdendo
    // força devagar, então a fumaça volta ao normal ~1,5s depois de parar
    const updateTrail = (now: number, dt: number) => {
      const decay = Math.exp(-dt * 1.8);
      for (let i = 0; i < TRAIL; i++) trail[i * 3 + 2] *= decay;
      if (pointer.moved && now - lastPush > 60) {
        trail.copyWithin(3, 0, (TRAIL - 1) * 3);
        trail[0] = pointer.x;
        trail[1] = pointer.y;
        trail[2] = 1;
        lastPush = now;
        pointer.moved = false;
      }
      gl.uniform3fv(uTrail, trail);
    };

    const render = () => {
      gl.uniform1f(uTime, time);
      gl.uniform1f(uScroll, fixed ? (window.scrollY * 0.25) / pixel : 0);
      gl.uniform1f(uAmount, amount);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // ~30 quadros por segundo: o fluxo é lento, não precisa de mais
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < 33) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      time += dt * speed;
      if (interactive) updateTrail(now, dt);
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
    const onVisibility = () => (document.hidden ? stop() : start());

    const themeObserver = new MutationObserver(() => {
      readInk();
      render();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const resizeObserver = new ResizeObserver(() => {
      resize();
      render();
    });
    resizeObserver.observe(canvas);
    const onScroll = () => {
      if (reduce && fixed) render();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / pixel;
      pointer.y = (rect.bottom - event.clientY) / pixel; // WebGL conta y de baixo
      pointer.moved = true;
    };

    readInk();
    resize();
    gl.uniform3fv(uTrail, trail);
    render();
    start();
    if (interactive && !reduce) window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      stop();
      themeObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [amount, speed, scale, pixel, fixed, colorVar, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.field} ${fixed ? styles.fixed : styles.inside} ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
