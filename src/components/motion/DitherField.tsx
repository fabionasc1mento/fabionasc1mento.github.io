"use client";

import { useEffect, useRef } from "react";
import styles from "./DitherField.module.css";

// Fumaça em dithering 1-bit (estilo computador antigo), desenhada na placa
// de vídeo com shaders WebGL pequenos, sem biblioteca:
// 1. ruído fractal com "domain warping" (o ruído distorce a si mesmo e vira
//    fumaça líquida);
// 2. dithering Bayer 8×8: cada pixel vira ligado/desligado, e o tom vem da
//    densidade de pixels ligados;
// 3. desenhado em resolução reduzida e ampliado com pixels duros.
//
// Interação (interactive): técnica de "flow map", a mesma de efeitos de
// fluido. Uma textura pequena e invisível guarda a velocidade do mouse
// "pintada" por onde ele passa; a cada quadro essa pintura é carregada por
// ela mesma (advecção) e vai sumindo. A fumaça é deslocada por esse campo,
// então o rastro é contínuo e escorre como líquido, sem saltos.
// Pausa com a aba escondida e fica parada com movimento reduzido.

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Velocidade guardada em rg (-1..1) e intensidade em b. Sem textura de ponto
// flutuante, os valores vão codificados em 0..1 (uEncoded = 1).
const CODEC = `
uniform float uEncoded;
vec4 decodeFlow(vec4 c) { return uEncoded > 0.5 ? vec4(c.rg * 2.0 - 1.0, c.b, 1.0) : c; }
vec4 encodeFlow(vec4 c) { return uEncoded > 0.5 ? vec4(c.rg * 0.5 + 0.5, c.b, 1.0) : c; }
`;

const FLOW = `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform vec2 uMouse;      // 0..1
uniform vec2 uVelocity;   // velocidade suavizada do mouse
uniform float uAspect;
uniform float uFalloff;
uniform float uDissipation;
uniform float uActive;
${CODEC}
void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  // Advecção: o campo é carregado pela própria velocidade (o rastro escorre)
  vec2 here = decodeFlow(texture2D(uPrev, uv)).rg;
  vec4 flow = decodeFlow(texture2D(uPrev, uv - here * uTexel * 3.0));
  flow.rgb *= uDissipation;
  // Carimbo do mouse: pinta a velocidade atual num círculo macio
  vec2 d = uv - uMouse;
  d.x *= uAspect;
  float fall = smoothstep(uFalloff, 0.0, length(d)) * uActive;
  vec3 stamp = vec3(uVelocity, min(1.0, length(uVelocity) * 1.4));
  flow.rgb = mix(flow.rgb, stamp, fall);
  gl_FragColor = encodeFlow(vec4(flow.rgb, 1.0));
}
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform vec3 uInk;
uniform float uAmount;
uniform float uScale;
uniform sampler2D uFlow;
uniform float uPush;
${CODEC}

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
  // Desloca o desenho pelo campo do mouse: um pouco no sentido do movimento
  // e um pouco de lado (vira redemoinho). O dithering continua na grade
  // original de pixels (frag); só a fumaça se mexe.
  vec4 flow = decodeFlow(texture2D(uFlow, frag / uRes));
  vec2 c = frag - (flow.rg + vec2(-flow.g, flow.r) * 0.45) * uPush;
  vec2 p = vec2(c.x, c.y - uScroll) / uScale;
  float t = uTime;
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05)), fbm(p + vec2(5.2, 1.3) - t * 0.04));
  vec2 r = vec2(fbm(p + 5.0 * q + vec2(1.7, 9.2) + t * 0.07), fbm(p + 5.0 * q + vec2(8.3, 2.8) - t * 0.05));
  float f = fbm(p + 5.0 * r);
  // Formas preenchidas em cinza (degradê pelo dithering), borda um pouco
  // mais clara e vazios pretos: o desenho da referência
  float edge = 1.0 - smoothstep(0.0, 0.06, abs(f - 0.47));
  float v = smoothstep(0.42, 0.64, f) * 0.55 + edge * 0.2 + smoothstep(0.64, 0.86, f) * 0.25;
  // Onde o mouse passou, a fumaça fica um pouco mais densa
  v += min(flow.b, 1.0) * 0.2 * smoothstep(0.3, 0.6, f);
  float bit = step(bayer8(frag) + 0.001, v);
  float a = bit * uAmount;
  gl_FragColor = vec4(uInk * a, a);
}
`;

const FLOW_WIDTH = 192; // resolução do campo do mouse (largura, em texels)
const ACTIVE_MS = 3000; // depois de mexer o mouse, quadros cheios por 3s

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
    const link = (fragment: string) => {
      const program = gl.createProgram()!;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
    };
    const main = link(FRAGMENT);
    if (!main) return;

    // Triângulo que cobre a tela toda, usado pelos dois programas
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const use = (program: WebGLProgram) => {
      gl.useProgram(program);
      const aPos = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    };
    const uniforms = (program: WebGLProgram) => (name: string) => gl.getUniformLocation(program, name);
    const um = uniforms(main);

    // ---------- campo do mouse (flow map), só no modo interativo ----------
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flowProgram = interactive && !reduce ? link(FLOW) : null;
    let flowSize = { w: FLOW_WIDTH, h: FLOW_WIDTH };
    let encoded = 1;
    let textures: WebGLTexture[] = [];
    let fbo: WebGLFramebuffer | null = null;
    let read = 0; // textura com o campo atual (a outra recebe o próximo)

    // Textura de meio ponto flutuante quando dá; senão bytes codificados
    const half = gl.getExtension("OES_texture_half_float");
    gl.getExtension("OES_texture_half_float_linear");
    gl.getExtension("EXT_color_buffer_half_float");

    const makeTexture = (type: number) => {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, flowSize.w, flowSize.h, 0, gl.RGBA, type, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };
    const clearFlow = () => {
      if (!fbo) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      textures.forEach((texture) => {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        // velocidade zero: 0 em float, 0,5 quando codificado
        gl.clearColor(encoded ? 0.5 : 0, encoded ? 0.5 : 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    const setupFlow = () => {
      if (!flowProgram) return;
      textures.forEach((texture) => gl.deleteTexture(texture));
      if (!fbo) fbo = gl.createFramebuffer();
      const aspect = canvas.width / Math.max(1, canvas.height);
      flowSize = { w: FLOW_WIDTH, h: Math.max(1, Math.round(FLOW_WIDTH / aspect)) };
      const tryType = (type: number) => {
        textures = [makeTexture(type), makeTexture(type)];
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[0], 0);
        const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (!ok) textures.forEach((texture) => gl.deleteTexture(texture));
        return ok;
      };
      encoded = 1;
      if (half && tryType(half.HALF_FLOAT_OES)) encoded = 0;
      else tryType(gl.UNSIGNED_BYTE);
      clearFlow();
    };

    // Mouse: posição alvo (eventos), posição suavizada e velocidade suavizada
    const mouse = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5, vx: 0, vy: 0, seen: false, lastMove: -Infinity };

    const stepFlow = (dt: number) => {
      if (!flowProgram || !fbo) return;
      // Mouse suavizado (sem tranco) e velocidade em "telas por segundo"
      const k = 1 - Math.exp(-dt * 18);
      const px = mouse.sx;
      const py = mouse.sy;
      mouse.sx += (mouse.x - mouse.sx) * k;
      mouse.sy += (mouse.y - mouse.sy) * k;
      const tvx = dt > 0 ? ((mouse.sx - px) / dt) * 0.9 : 0;
      const tvy = dt > 0 ? ((mouse.sy - py) / dt) * 0.9 : 0;
      const kv = 1 - Math.exp(-dt * 10);
      mouse.vx += (tvx - mouse.vx) * kv;
      mouse.vy += (tvy - mouse.vy) * kv;
      const len = Math.hypot(mouse.vx, mouse.vy);
      const clamp = len > 1 ? 1 / len : 1;

      use(flowProgram);
      const uf = uniforms(flowProgram);
      const write = 1 - read;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[write], 0);
      gl.viewport(0, 0, flowSize.w, flowSize.h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[read]);
      gl.uniform1i(uf("uPrev"), 0);
      gl.uniform2f(uf("uTexel"), 1 / flowSize.w, 1 / flowSize.h);
      gl.uniform2f(uf("uMouse"), mouse.sx, mouse.sy);
      gl.uniform2f(uf("uVelocity"), mouse.vx * clamp, mouse.vy * clamp);
      gl.uniform1f(uf("uAspect"), flowSize.w / flowSize.h);
      gl.uniform1f(uf("uFalloff"), 0.16);
      // ~1,2s até sumir, independente da taxa de quadros
      gl.uniform1f(uf("uDissipation"), Math.pow(0.975, dt * 60));
      gl.uniform1f(uf("uActive"), mouse.seen ? 1 : 0);
      gl.uniform1f(uf("uEncoded"), encoded);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      read = write;
    };

    let frame = 0;
    let last = 0;
    let time = 7.3; // começa num ponto bonito do fluxo

    const readInk = () => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim() || "#e3e3e1";
      const hex = value.replace("#", "");
      const n = parseInt(hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex, 16);
      use(main);
      gl.uniform3f(um("uInk"), ((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width / pixel));
      canvas.height = Math.max(1, Math.round(rect.height / pixel));
      setupFlow();
      use(main);
      gl.uniform2f(um("uRes"), canvas.width, canvas.height);
      gl.uniform1f(um("uScale"), scale / pixel);
      gl.uniform1f(um("uPush"), 70 / pixel);
    };

    const render = () => {
      use(main);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[read] ?? null);
      gl.uniform1i(um("uFlow"), 0);
      gl.uniform1f(um("uEncoded"), flowProgram ? encoded : 0);
      gl.uniform1f(um("uPush"), flowProgram ? 70 / pixel : 0);
      gl.uniform1f(um("uTime"), time);
      gl.uniform1f(um("uScroll"), fixed ? (window.scrollY * 0.25) / pixel : 0);
      gl.uniform1f(um("uAmount"), amount);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Quadros cheios enquanto o mouse mexe (e 3s depois, até o rastro
    // sumir); parado, ~30 quadros por segundo bastam para o fluxo lento
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const active = now - mouse.lastMove < ACTIVE_MS;
      if (!active && now - last < 33) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      time += dt * speed;
      if (active) stepFlow(dt);
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
      mouse.x = (event.clientX - rect.left) / rect.width;
      mouse.y = 1 - (event.clientY - rect.top) / rect.height; // WebGL conta y de baixo
      if (!mouse.seen) {
        mouse.sx = mouse.x;
        mouse.sy = mouse.y;
        mouse.seen = true;
      }
      mouse.lastMove = performance.now();
    };
    const onPointerLeave = () => {
      mouse.seen = false;
    };

    gl.disable(gl.BLEND);
    resize();
    readInk();
    render();
    start();
    if (flowProgram) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      stop();
      themeObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      textures.forEach((texture) => gl.deleteTexture(texture));
      if (fbo) gl.deleteFramebuffer(fbo);
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
