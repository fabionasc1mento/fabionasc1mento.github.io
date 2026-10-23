// Vozes: cada som do site, sintetizado na hora com a Web Audio API (sem
// arquivos de áudio). Cada função só agenda nós de áudio num instante "t" e
// numa saída "out"; não guarda estado. Por isso dá para tocar ao vivo
// (engine.ts) ou renderizar offline num arquivo (para conferir os níveis).
//
// Linguagem sonora: cyber + água. Cliques e bipes curtos de terminal nos
// botões e na digitação; gotas e bolhas no hover e no oceano.

export type Out = AudioNode;

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** 1 s de ruído branco, criado uma vez por contexto */
export function whiteNoise(ctx: BaseAudioContext) {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

/** Envelope: sobe rápido até "peak" e cai exponencialmente */
function envelope(param: AudioParam, t: number, peak: number, attack: number, decay: number) {
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(
  ctx: BaseAudioContext,
  out: Out,
  t: number,
  type: OscillatorType,
  from: number,
  to: number,
  glide: number,
  peak: number,
  attack: number,
  decay: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + glide);
  envelope(gain.gain, t, peak, attack, decay);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + attack + decay + 0.02);
  return osc;
}

function burst(
  ctx: BaseAudioContext,
  out: Out,
  t: number,
  filter: BiquadFilterType,
  freq: number,
  q: number,
  peak: number,
  decay: number,
) {
  const src = ctx.createBufferSource();
  src.buffer = whiteNoise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const gain = ctx.createGain();
  envelope(gain.gain, t, peak, 0.001, decay);
  src.connect(f).connect(gain).connect(out);
  // começa num ponto aleatório do ruído: cada clique soa um pouco diferente
  src.start(t, Math.random() * 0.8);
  src.stop(t + decay + 0.02);
}

const pick = (r: number, min: number, max: number) => min + (max - min) * r;

/** Hover em botões e links: gota pequena (bolha que sobe de tom) */
export function hover(ctx: BaseAudioContext, out: Out, t: number, r = Math.random()) {
  const f = pick(r, 620, 860);
  tone(ctx, out, t, "sine", f, f * 2.1, 0.05, 0.05, 0.003, 0.08);
}

/** Clique: tique seco de terminal + bipe + corpo grave de água */
export function click(ctx: BaseAudioContext, out: Out, t: number, r = Math.random()) {
  burst(ctx, out, t, "bandpass", pick(r, 2800, 3600), 1.4, 0.16, 0.014);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3200;
  lp.connect(out);
  const blip = tone(ctx, lp, t + 0.004, "square", 1320, 1320, 0, 0.022, 0.002, 0.045);
  blip.frequency.setValueAtTime(990, t + 0.024);
  tone(ctx, out, t, "sine", 240, 110, 0.08, 0.09, 0.002, 0.12);
}

/** Liga/desliga (tema, som): dois bipes subindo ou descendo */
export function toggle(ctx: BaseAudioContext, out: Out, t: number, on: boolean) {
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2800;
  lp.connect(out);
  const [a, b] = on ? [660, 990] : [990, 660];
  tone(ctx, lp, t, "square", a, a, 0, 0.03, 0.002, 0.05);
  tone(ctx, lp, t + 0.06, "square", b, b, 0, 0.03, 0.002, 0.07);
}

export type KeyKind = "key" | "space" | "erase";

/**
 * Tecla de teclado mecânico macio ("thock"), em quatro camadas:
 * clique agudo do switch, corpo de plástico, batida grave no fundo e, às
 * vezes, o clique mais fraco da tecla voltando. Espaço é mais grave e
 * longo; apagar é um pouco mais abafado. Força e timbre variam a cada
 * tecla, como dedo de verdade.
 */
export function key(ctx: BaseAudioContext, out: Out, t: number, kind: KeyKind = "key", r = Math.random()) {
  const space = kind === "space";
  const erase = kind === "erase";
  const force = pick(Math.random(), 0.7, 1);
  // 1) clique do switch: transiente agudo curtíssimo
  burst(ctx, out, t, "highpass", 4200, 0.7, 0.05 * force, 0.006);
  // 2) corpo da tecla
  const body = (space ? 520 : erase ? 760 : 980) * pick(r, 0.88, 1.12);
  burst(ctx, out, t + 0.002, "bandpass", body, space ? 3 : 5, 0.17 * force, space ? 0.06 : 0.035);
  // 3) batida no fundo do curso
  tone(ctx, out, t + 0.003, "sine", space ? 150 : 210, space ? 95 : 140, 0.03, 0.06 * force, 0.001, space ? 0.06 : 0.035);
  // 4) a tecla voltando (nem sempre se ouve)
  if (Math.random() < 0.55) {
    burst(ctx, out, t + pick(Math.random(), 0.055, 0.085), "bandpass", 2600 * pick(Math.random(), 0.9, 1.1), 2, 0.035 * force, 0.008);
  }
}

// Escala pentatônica: qualquer sequência de nós soa bem junta
const NODE_NOTES = [659.3, 784, 880, 1046.5, 1174.7, 1318.5];

/**
 * Nó da trilha de experiência: "ping" de sonar ao acender (descendo).
 * Apagando (rolando para cima) é o mesmo nó "desligando": a nota escorrega
 * para baixo e o eco vem uma oitava abaixo, em vez de acima.
 */
export function node(ctx: BaseAudioContext, out: Out, t: number, index: number, off = false) {
  const f = NODE_NOTES[index % NODE_NOTES.length];
  if (off) {
    tone(ctx, out, t, "sine", f, f * 0.75, 0.18, 0.045, 0.004, 0.35);
    tone(ctx, out, t + 0.07, "sine", f / 2, f / 2.2, 0.2, 0.02, 0.004, 0.3);
    return;
  }
  tone(ctx, out, t, "sine", f, f, 0, 0.05, 0.004, 0.45);
  tone(ctx, out, t + 0.07, "sine", f * 2, f * 2, 0, 0.018, 0.004, 0.3);
  tone(ctx, out, t, "triangle", f / 2, f / 2, 0, 0.015, 0.004, 0.2);
}

/** Bipe curto de confirmação (linha extraída na demonstração) */
export function blip(ctx: BaseAudioContext, out: Out, t: number, r = Math.random()) {
  const f = pick(r, 1480, 1660);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3500;
  lp.connect(out);
  tone(ctx, lp, t, "square", f, f, 0, 0.016, 0.002, 0.05);
}

/** Bolha subindo (ambiente e gotas) */
export function bubble(ctx: BaseAudioContext, out: Out, t: number, peak = 0.03, r = Math.random()) {
  const f = pick(r, 380, 900);
  tone(ctx, out, t, "sine", f, f * 1.9, 0.045, peak, 0.004, 0.06);
}

/** Clique/toque na água: "bloop" grave + bolhas */
export function drop(ctx: BaseAudioContext, out: Out, t: number, r = Math.random()) {
  tone(ctx, out, t, "sine", pick(r, 240, 300), pick(r, 640, 760), 0.09, 0.12, 0.003, 0.22);
  tone(ctx, out, t, "sine", 95, 48, 0.12, 0.08, 0.002, 0.18);
  bubble(ctx, out, t + 0.08, 0.04);
  bubble(ctx, out, t + 0.15, 0.025);
}

/** Entrada com som: varredura subindo e um acorde de confirmação */
export function boot(ctx: BaseAudioContext, out: Out, t: number) {
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 6;
  lp.frequency.setValueAtTime(180, t);
  lp.frequency.exponentialRampToValueAtTime(2600, t + 0.55);
  lp.connect(out);
  tone(ctx, lp, t, "sawtooth", 110, 220, 0.55, 0.035, 0.05, 0.6);
  [523.3, 784, 1046.5].forEach((f, i) => tone(ctx, out, t + 0.32 + i * 0.07, "sine", f, f, 0, 0.045, 0.004, 0.7));
  bubble(ctx, out, t + 0.5, 0.03);
  bubble(ctx, out, t + 0.62, 0.02);
}

/** Resposta de impulso de uma sala pequena e úmida (para o reverb) */
export function roomImpulse(ctx: BaseAudioContext, seconds = 1.6) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < length; i++) {
      // ruído levemente filtrado (agudos morrem antes: soa "molhado")
      last = last * 0.55 + (Math.random() * 2 - 1) * 0.45;
      data[i] = last * Math.pow(1 - i / length, 3.2);
    }
  }
  return buffer;
}
