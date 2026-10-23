// Motor de som do site: um único AudioContext, mixer simples e ambiente.
//
//   vozes ──► (pan) ──► efeitos ──┬─────────────► master ──► compressor ──► saída
//                                  └─► reverb ──►
//   ambiente submarino ─────────────────────────► master
//
// Navegador só deixa tocar som depois de um gesto da pessoa (clique,
// tecla). Por isso o contexto nasce dentro do clique de "entrar com som" ou
// do botão de som. A escolha fica salva no navegador.
// Tudo aqui só roda no navegador; importar no servidor não faz nada.

import * as voices from "./voices";

type Pref = "on" | "off";
const KEY = "sound";
export const SOUND_EVENT = "soundchange";

let ctx: AudioContext | null = null;
let master: GainNode;
let sfx: GainNode;
let ambient: { gain: GainNode; stir: GainNode; stop: () => void } | null = null;
let enabled = false;
let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
const last: Record<string, number> = {};

function readPref(): Pref | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "on" || value === "off" ? value : null;
  } catch {
    return null;
  }
}

function writePref(value: Pref) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // sem localStorage: vale só até recarregar
  }
}

function setup() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 4;
  compressor.connect(ctx.destination);
  master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(compressor);
  sfx = ctx.createGain();
  sfx.gain.value = 1.5;
  sfx.connect(master);
  const reverb = ctx.createConvolver();
  reverb.buffer = voices.roomImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  sfx.connect(reverb).connect(wet).connect(master);
  return ctx;
}

/** Fundo submarino: mar grave que respira, zumbido baixo e bolhas raras */
function startAmbient(c: AudioContext) {
  const gain = c.createGain();
  gain.gain.value = 0.0001;
  gain.connect(master);

  const sea = c.createBufferSource();
  sea.buffer = voices.brownNoise(c);
  sea.loop = true;
  const seaFilter = c.createBiquadFilter();
  seaFilter.type = "lowpass";
  seaFilter.frequency.value = 340;
  const breathe = c.createOscillator(); // o filtro abre e fecha devagar: ondas
  breathe.frequency.value = 0.07;
  const breatheDepth = c.createGain();
  breatheDepth.gain.value = 140;
  breathe.connect(breatheDepth).connect(seaFilter.frequency);
  const seaGain = c.createGain();
  seaGain.gain.value = 0.55;
  sea.connect(seaFilter).connect(seaGain).connect(gain);

  const drones = [55, 82.4].map((f, i) => {
    const osc = c.createOscillator();
    osc.frequency.value = f;
    const g = c.createGain();
    g.gain.value = i === 0 ? 0.16 : 0.08;
    osc.connect(g).connect(gain);
    return osc;
  });

  // Água mexida pelo mouse: chiado que sobe com a velocidade
  const stirSrc = c.createBufferSource();
  stirSrc.buffer = voices.whiteNoise(c);
  stirSrc.loop = true;
  const stirFilter = c.createBiquadFilter();
  stirFilter.type = "bandpass";
  stirFilter.frequency.value = 650;
  stirFilter.Q.value = 0.8;
  const stir = c.createGain();
  stir.gain.value = 0;
  stirSrc.connect(stirFilter).connect(stir).connect(master);

  const sources = [sea, breathe, stirSrc, ...drones];
  sources.forEach((s) => s.start());
  gain.gain.setTargetAtTime(0.035, c.currentTime, 1.2); // entra devagar, bem baixo

  const scheduleBubbles = () => {
    bubbleTimer = setTimeout(
      () => {
        if (ctx && enabled && ctx.state === "running") {
          const count = 2 + Math.floor(Math.random() * 4);
          for (let i = 0; i < count; i++) {
            voices.bubble(ctx, sfx, ctx.currentTime + i * (0.06 + Math.random() * 0.09), 0.012 + Math.random() * 0.014);
          }
        }
        scheduleBubbles();
      },
      5000 + Math.random() * 9000,
    );
  };
  scheduleBubbles();

  return {
    gain,
    stir,
    stop: () => {
      clearTimeout(bubbleTimer);
      sources.forEach((s) => s.stop());
      gain.disconnect();
      stir.disconnect();
    },
  };
}

function announce() {
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: enabled }));
}

/** Toca uma voz respeitando um intervalo mínimo (evita metralhadora) */
function play(name: string, gap: number, fn: (c: AudioContext, out: AudioNode, t: number) => void, pan?: number) {
  // (contexto recém-criado pode estar "suspended" por alguns ms: o som
  // fica agendado e toca assim que ele retoma)
  if (!enabled || !ctx || ctx.state === "closed") return;
  const now = performance.now();
  if (now - (last[name] ?? 0) < gap) return;
  last[name] = now;
  let out: AudioNode = sfx;
  if (pan !== undefined && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-0.6, Math.min(0.6, pan));
    panner.connect(sfx);
    out = panner;
  }
  fn(ctx, out, ctx.currentTime + 0.005);
}

/** Posição horizontal na tela → pan (-0,6 esquerda a 0,6 direita) */
const panAt = (x?: number) => (x === undefined ? undefined : ((x / window.innerWidth) * 2 - 1) * 0.6);

export const sound = {
  get enabled() {
    return enabled;
  },
  /** Escolha salva: "on", "off" ou null (nunca escolheu) */
  get pref() {
    return readPref();
  },

  /** Liga o som. Precisa ser chamado dentro de um clique/tecla. */
  enable(persist = true) {
    const c = setup();
    if (!c) return;
    void c.resume();
    enabled = true;
    if (!ambient) ambient = startAmbient(c);
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setTargetAtTime(0.85, c.currentTime, 0.15);
    if (persist) writePref("on");
    announce();
  },

  disable(persist = true) {
    enabled = false;
    if (persist) writePref("off");
    if (ctx) {
      const c = ctx;
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
      setTimeout(() => {
        if (!enabled) {
          ambient?.stop();
          ambient = null;
          void c.suspend();
        }
      }, 600);
    }
    announce();
  },

  /** Aba escondida: silencia tudo; voltou: retoma se estava ligado */
  pause() {
    if (ctx && ctx.state === "running") void ctx.suspend();
  },
  resume() {
    if (ctx && enabled) void ctx.resume();
  },

  hover: (x?: number) => play("hover", 45, (c, o, t) => voices.hover(c, o, t), panAt(x)),
  click: (x?: number) => play("click", 40, (c, o, t) => voices.click(c, o, t), panAt(x)),
  toggle: (on: boolean) => play("toggle", 60, (c, o, t) => voices.toggle(c, o, t, on)),
  key: (erase = false) => play("key", 32, (c, o, t) => voices.key(c, o, t, erase)),
  node: (index: number) => play("node", 90, (c, o, t) => voices.node(c, o, t, index)),
  blip: () => play("blip", 40, (c, o, t) => voices.blip(c, o, t)),
  glitch: () => play("glitch", 150, (c, o, t) => voices.glitch(c, o, t)),
  drop: (x?: number) => play("drop", 80, (c, o, t) => voices.drop(c, o, t), panAt(x)),
  boot: () => play("boot", 500, (c, o, t) => voices.boot(c, o, t)),

  /** Velocidade do mouse sobre a água (px/s) → volume do chiado */
  stir(speed: number) {
    if (!enabled || !ctx || !ambient) return;
    const target = Math.min(1, speed / 2200) * 0.05;
    const now = ctx.currentTime;
    if (Math.abs(target - (last.stirValue ?? 0)) < 0.002) return;
    last.stirValue = target;
    ambient.stir.gain.setTargetAtTime(target, now, 0.12);
  },
};
