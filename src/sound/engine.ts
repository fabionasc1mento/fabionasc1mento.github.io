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
let keys: GainNode; // teclas: seco, sem reverb (reverb deixava a digitação embolada)
let ambient: { gain: GainNode; stop: () => void } | null = null;
let nextNode = 0; // pings da trilha em fila, para nenhum se perder
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
  keys = ctx.createGain();
  keys.gain.value = 1.3;
  keys.connect(master);
  return ctx;
}

/** Fundo submarino: zumbido bem baixo e bolhas raras (sem chiado de mar) */
function startAmbient(c: AudioContext) {
  const gain = c.createGain();
  gain.gain.value = 0.0001;
  gain.connect(master);

  const drones = [55, 82.4].map((f, i) => {
    const osc = c.createOscillator();
    osc.frequency.value = f;
    const g = c.createGain();
    g.gain.value = i === 0 ? 0.16 : 0.08;
    osc.connect(g).connect(gain);
    return osc;
  });

  const sources = drones;
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
    stop: () => {
      clearTimeout(bubbleTimer);
      sources.forEach((s) => s.stop());
      gain.disconnect();
    },
  };
}

function announce() {
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: enabled }));
}

/** Toca uma voz respeitando um intervalo mínimo (evita metralhadora) */
function play(
  name: string,
  gap: number,
  fn: (c: AudioContext, out: AudioNode, t: number) => void,
  pan?: number,
  bus?: () => AudioNode,
) {
  // (contexto recém-criado pode estar "suspended" por alguns ms: o som
  // fica agendado e toca assim que ele retoma)
  if (!enabled || !ctx || ctx.state === "closed") return;
  const now = performance.now();
  if (now - (last[name] ?? 0) < gap) return;
  last[name] = now;
  let out: AudioNode = bus ? bus() : sfx;
  if (pan !== undefined && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-0.6, Math.min(0.6, pan));
    panner.connect(out);
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
  /** Tecla: o intervalo mínimo varia (38–70 ms), então rolar rápido soa
   *  como alguém digitando, não como metralhadora em ritmo fixo */
  key: (kind: voices.KeyKind = "key") =>
    play("key", 38 + Math.random() * 32, (c, o, t) => voices.key(c, o, t, kind), undefined, () => keys),
  /** Ping da trilha: se vários acendem juntos (rolagem rápida), toca em
   *  sequência, 90 ms entre eles, em vez de descartar */
  node(index: number, off = false) {
    if (!enabled || !ctx || ctx.state === "closed") return;
    const at = Math.max(ctx.currentTime + 0.005, nextNode);
    nextNode = at + 0.09;
    voices.node(ctx, sfx, at, index, off);
  },
  blip: () => play("blip", 40, (c, o, t) => voices.blip(c, o, t)),
  drop: (x?: number) => play("drop", 80, (c, o, t) => voices.drop(c, o, t), panAt(x)),
  boot: () => play("boot", 500, (c, o, t) => voices.boot(c, o, t)),
};
