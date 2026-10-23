// Oceano do fundo: o "modelo" da animação (no MVC, seria o Model).
// Simula tubarões e cardumes em pixels de tela e desenha o resultado numa
// grade de células, onde cada célula guarda uma densidade (0 a 1). Quem
// transforma a grade em caracteres na tela é o OceanField (a "view", em
// WebGL). Este arquivo não sabe nada de navegador nem de WebGL.

const TAU = Math.PI * 2;

// ---------- utilidades ----------
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Diferença entre dois ângulos, sempre entre -π e π */
const angleDiff = (target: number, current: number) => {
  let d = (target - current) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
const hash1 = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
/** Ruído suave de -1 a 1: dá curvas naturais, sem trancos */
const noise1 = (x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash1(i) * (1 - u) + hash1(i + 1) * u) * 2 - 1;
};

// ---------- grade de caracteres ----------
export class Grid {
  cols = 1;
  rows = 1;
  density = new Float32Array(1);
  accent = new Uint8Array(1);
  /** quem pintou cada célula: um tubarão mais perto cobre o mais fundo */
  owner = new Uint8Array(1);
  layer = 0;
  /** RGBA pronto para subir como textura: r = densidade, b = destaque */
  bytes = new Uint8Array(4);

  constructor(
    readonly cellW: number,
    readonly cellH: number,
  ) {}

  resize(width: number, height: number) {
    this.cols = Math.max(1, Math.ceil(width / this.cellW));
    this.rows = Math.max(1, Math.ceil(height / this.cellH));
    const n = this.cols * this.rows;
    this.density = new Float32Array(n);
    this.accent = new Uint8Array(n);
    this.owner = new Uint8Array(n);
    this.bytes = new Uint8Array(n * 4);
  }

  clear() {
    this.density.fill(0);
    this.accent.fill(0);
    this.owner.fill(0);
    this.layer = 0;
  }

  private write(i: number, v: number) {
    if (this.owner[i] < this.layer || v > this.density[i]) {
      if (this.owner[i] < this.layer) this.accent[i] = 0;
      this.density[i] = this.owner[i] < this.layer ? v : Math.max(v, this.density[i]);
      this.owner[i] = this.layer;
    }
  }

  /**
   * Pinta um "tubo" que afina de a até b (raio ra → rb). No centro a
   * densidade é alta e cai para as bordas: vira caracteres densos no meio
   * do corpo (@, 8) e leves na borda (', :).
   */
  stamp(ax: number, ay: number, bx: number, by: number, ra: number, rb: number, k: number) {
    const min = this.cellW * 0.55; // nada fica fino demais para aparecer
    ra = Math.max(ra, min);
    rb = Math.max(rb, min);
    const r = Math.max(ra, rb);
    const c0 = Math.max(0, Math.floor((Math.min(ax, bx) - r) / this.cellW));
    const c1 = Math.min(this.cols - 1, Math.floor((Math.max(ax, bx) + r) / this.cellW));
    const r0 = Math.max(0, Math.floor((Math.min(ay, by) - r) / this.cellH));
    const r1 = Math.min(this.rows - 1, Math.floor((Math.max(ay, by) + r) / this.cellH));
    if (c0 > c1 || r0 > r1) return;
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = Math.max(abx * abx + aby * aby, 1e-6);
    for (let row = r0; row <= r1; row++) {
      const py = (row + 0.5) * this.cellH;
      for (let col = c0; col <= c1; col++) {
        const px = (col + 0.5) * this.cellW;
        const t = clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
        const dx = px - (ax + abx * t);
        const dy = py - (ay + aby * t);
        const rad = ra + (rb - ra) * t;
        const d2 = (dx * dx + dy * dy) / (rad * rad);
        if (d2 >= 1) continue;
        this.write(row * this.cols + col, k * (1 - 0.72 * d2));
      }
    }
  }

  /** Uma célula só (peixinho) */
  dot(x: number, y: number, k: number) {
    const col = Math.floor(x / this.cellW);
    const row = Math.floor(y / this.cellH);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
    this.write(row * this.cols + col, k);
  }

  /** Célula na cor de destaque (olhos) */
  mark(x: number, y: number) {
    const col = Math.floor(x / this.cellW);
    const row = Math.floor(y / this.cellH);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
    const i = row * this.cols + col;
    this.accent[i] = 1;
    this.density[i] = Math.max(this.density[i], 0.95);
  }

  pack() {
    const { density, accent, bytes } = this;
    for (let i = 0, j = 0; i < density.length; i++, j += 4) {
      bytes[j] = Math.min(255, density[i] * 255);
      bytes[j + 1] = 0;
      bytes[j + 2] = accent[i] * 255;
      bytes[j + 3] = 255;
    }
    return bytes;
  }
}

// ---------- estado compartilhado ----------
export type Bounds = { left: number; top: number; right: number; bottom: number };
export type Pointer = { x: number; y: number; speed: number; active: boolean };

// ---------- tubarão ----------
export type SharkKind = "shark" | "hammerhead";
const SPINE = 26;

class Shark {
  /** pontos da coluna (x, y), da cabeça ao rabo */
  spine = new Float32Array(SPINE * 2);
  /** pontos desenhados: coluna + ondulação lateral */
  body = new Float32Array(SPINE * 2);
  tangent = new Float32Array(SPINE * 2);
  angle: number;
  speed: number;
  turn = 0;
  phase: number;
  readonly cruise: number;
  readonly segment: number;

  constructor(
    readonly kind: SharkKind,
    readonly length: number,
    /** tubarões menores parecem mais fundos: mais apagados */
    readonly depth: number,
    x: number,
    y: number,
    angle: number,
    readonly seed: number,
  ) {
    this.angle = angle;
    this.cruise = 34 + length * 0.07;
    this.speed = this.cruise;
    this.phase = seed * 10;
    this.segment = length / (SPINE - 1);
    // Começa reto, com o corpo atrás da cabeça
    for (let i = 0; i < SPINE; i++) {
      this.spine[i * 2] = x - Math.cos(angle) * this.segment * i;
      this.spine[i * 2 + 1] = y - Math.sin(angle) * this.segment * i;
    }
  }

  get x() {
    return this.spine[0];
  }
  get y() {
    return this.spine[1];
  }

  update(dt: number, world: World) {
    const { bounds, time, pointer } = world;
    const x = this.x;
    const y = this.y;
    // Passeio: curva lenta e imprevisível
    let turn = noise1(time * 0.09 + this.seed * 7) * 0.35;

    // Olha adiante: se o caminho vai sair da tela, começa a curva cedo
    // (com raio de curva grande, virar só depois de sair seria tarde)
    const ahead = this.length * 0.9;
    const fx = x + Math.cos(this.angle) * ahead;
    const fy = y + Math.sin(this.angle) * ahead;
    const padX = (bounds.right - bounds.left) * 0.08;
    const padY = (bounds.bottom - bounds.top) * 0.08;
    const over = Math.max(
      bounds.left + padX - fx,
      fx - (bounds.right - padX),
      bounds.top + padY - fy,
      fy - (bounds.bottom - padY),
      0,
    );
    if (over > 0) {
      const cx = (bounds.left + bounds.right) / 2 + noise1(this.seed * 13 + time * 0.05) * (bounds.right - bounds.left) * 0.2;
      const cy = (bounds.top + bounds.bottom) / 2 + noise1(this.seed * 17 + time * 0.05) * (bounds.bottom - bounds.top) * 0.2;
      const toCenter = angleDiff(Math.atan2(cy - y, cx - x), this.angle);
      turn += Math.sign(toCenter) * clamp(over / (this.length * 0.3), 0.3, 1) * 2;
    }

    // Não encosta nos outros tubarões
    for (const other of world.sharks) {
      if (other === this) continue;
      const dx = x - other.body[Math.floor(SPINE * 0.35) * 2];
      const dy = y - other.body[Math.floor(SPINE * 0.35) * 2 + 1];
      const reach = (this.length + other.length) * 0.4;
      const d = Math.hypot(dx, dy);
      if (d < reach) {
        const away = angleDiff(Math.atan2(dy, dx), this.angle);
        turn += away * 1.2 * (1 - d / reach);
      }
    }

    // Curioso: quando a água mexe, o tubarão mais perto vira para lá
    if (pointer.active && pointer.speed > 60) {
      const dx = pointer.x - x;
      const dy = pointer.y - y;
      const d = Math.hypot(dx, dy);
      if (d > this.length * 0.35 && d < this.length * 1.6) {
        turn += angleDiff(Math.atan2(dy, dx), this.angle) * 0.35 * (1 - d / (this.length * 1.6));
      }
    }

    // Raio de curva proporcional ao corpo: o tubarão não se dobra ao meio
    const maxTurn = this.speed / (this.length * 0.45);
    turn = clamp(turn, -maxTurn, maxTurn);
    this.turn += (turn - this.turn) * Math.min(1, dt * 1.8);
    this.angle += this.turn * dt;

    const target = this.cruise * (0.88 + 0.28 * noise1(time * 0.07 + this.seed * 3));
    this.speed += (target - this.speed) * Math.min(1, dt * 0.8);
    // Batida do rabo: mais rápida quando nada mais rápido ou vira
    this.phase += dt * TAU * (0.42 + 0.32 * (this.speed / this.cruise) + Math.abs(this.turn) * 0.25);

    // Cabeça anda; o resto do corpo segue a cabeça mantendo a distância
    const s = this.spine;
    s[0] += Math.cos(this.angle) * this.speed * dt;
    s[1] += Math.sin(this.angle) * this.speed * dt;
    for (let i = 1; i < SPINE; i++) {
      const dx = s[i * 2] - s[(i - 1) * 2];
      const dy = s[i * 2 + 1] - s[(i - 1) * 2 + 1];
      const d = Math.hypot(dx, dy) || 1;
      s[i * 2] = s[(i - 1) * 2] + (dx / d) * this.segment;
      s[i * 2 + 1] = s[(i - 1) * 2 + 1] + (dy / d) * this.segment;
    }
    this.pose();
  }

  /** Aplica a ondulação do nado: onda que corre da cabeça ao rabo */
  pose() {
    const s = this.spine;
    const L = this.length;
    for (let i = 0; i < SPINE; i++) {
      const prev = Math.max(0, i - 1);
      const next = Math.min(SPINE - 1, i + 1);
      let tx = s[prev * 2] - s[next * 2];
      let ty = s[prev * 2 + 1] - s[next * 2 + 1];
      const d = Math.hypot(tx, ty) || 1;
      tx /= d;
      ty /= d;
      this.tangent[i * 2] = tx; // aponta para a frente (cabeça)
      this.tangent[i * 2 + 1] = ty;
      const t = i / (SPINE - 1);
      const lateral =
        L * 0.05 * Math.pow(t, 1.5) * Math.sin(this.phase - t * TAU * 0.85) +
        L * 0.01 * Math.sin(this.phase + 1.4) * (1 - t);
      // normal = tangente girada 90°
      this.body[i * 2] = s[i * 2] - ty * lateral;
      this.body[i * 2 + 1] = s[i * 2 + 1] + tx * lateral;
    }
  }

  /** Meia largura do corpo ao longo do comprimento (t: 0 cabeça, 1 rabo) */
  width(t: number) {
    const hammer = this.kind === "hammerhead";
    const peak = hammer ? 0.25 : 0.28;
    const shape =
      t < peak ? Math.pow(Math.sin((t / peak) * (Math.PI / 2)), 0.55) : 1 - 0.86 * smoothstep(peak, 0.9, t);
    return this.length * (hammer ? 0.082 : 0.098) * shape;
  }

  draw(grid: Grid) {
    const b = this.body;
    const tg = this.tangent;
    const L = this.length;
    const k = this.depth;
    const at = (t: number) => Math.round(t * (SPINE - 1));

    // Corpo
    for (let i = 0; i < SPINE - 1; i++) {
      const t0 = i / (SPINE - 1);
      const t1 = (i + 1) / (SPINE - 1);
      grid.stamp(b[i * 2], b[i * 2 + 1], b[i * 2 + 2], b[i * 2 + 3], this.width(t0), this.width(t1), k * 0.82);
    }
    // Barbatana dorsal vista de cima: uma crista mais densa no dorso
    const d0 = at(0.3);
    const d1 = at(0.47);
    for (let i = d0; i < d1; i++) {
      grid.stamp(b[i * 2], b[i * 2 + 1], b[i * 2 + 2], b[i * 2 + 3], L * 0.028, L * 0.02, k);
    }

    // Barbatanas em pares (peitorais e pélvicas), viradas para trás
    const fin = (t: number, out: number, back: number, ra: number, rb: number, strength: number) => {
      const i = at(t);
      const tx = tg[i * 2];
      const ty = tg[i * 2 + 1];
      const w = this.width(t) * 0.7;
      for (const side of [-1, 1]) {
        const nx = -ty * side;
        const ny = tx * side;
        const rx = b[i * 2] + nx * w;
        const ry = b[i * 2 + 1] + ny * w;
        grid.stamp(rx, ry, rx + nx * L * out - tx * L * back, ry + ny * L * out - ty * L * back, L * ra, L * rb, k * strength);
      }
    };
    const hammer = this.kind === "hammerhead";
    fin(0.27, hammer ? 0.15 : 0.18, 0.12, 0.05, 0.012, 0.62);
    fin(0.6, 0.07, 0.06, 0.024, 0.008, 0.5);

    // Nadadeira do rabo: dois lobos, o de cima maior
    const e = SPINE - 1;
    const ex = b[e * 2];
    const ey = b[e * 2 + 1];
    const btx = -tg[e * 2];
    const bty = -tg[e * 2 + 1];
    grid.stamp(ex, ey, ex + btx * L * 0.11 - bty * L * 0.075, ey + bty * L * 0.11 + btx * L * 0.075, L * 0.03, L * 0.008, k * 0.7);
    grid.stamp(ex, ey, ex + btx * L * 0.07 + bty * L * 0.045, ey + bty * L * 0.07 - btx * L * 0.045, L * 0.024, L * 0.008, k * 0.6);

    // Cabeça: martelo ou focinho com olhos
    if (hammer) {
      const i = at(0.035);
      const hx = b[i * 2];
      const hy = b[i * 2 + 1];
      const tx = tg[i * 2];
      const ty = tg[i * 2 + 1];
      for (const side of [-1, 1]) {
        const endX = hx - ty * side * L * 0.14 - tx * L * 0.03;
        const endY = hy + tx * side * L * 0.14 - ty * L * 0.03;
        grid.stamp(hx, hy, endX, endY, L * 0.034, L * 0.024, k * 0.85);
        grid.mark(endX, endY);
      }
    } else {
      const i = at(0.075);
      const w = this.width(0.075) * 0.7;
      for (const side of [-1, 1]) {
        grid.mark(b[i * 2] - tg[i * 2 + 1] * side * w, b[i * 2 + 1] + tg[i * 2] * side * w);
      }
    }
  }
}

// ---------- cardume ----------
type Fish = { x: number; y: number; vx: number; vy: number };

class School {
  fish: Fish[] = [];

  constructor(
    count: number,
    x: number,
    y: number,
    readonly cruise: number,
    /** alinhamento alto = fila; baixo = enxame */
    readonly align: number,
  ) {
    const angle = Math.random() * TAU;
    for (let i = 0; i < count; i++) {
      this.fish.push({
        x: x + (Math.random() - 0.5) * 120,
        y: y + (Math.random() - 0.5) * 80,
        vx: Math.cos(angle) * cruise,
        vy: Math.sin(angle) * cruise,
      });
    }
  }

  update(dt: number, world: World) {
    const { bounds, pointer, sharks } = world;
    const fish = this.fish;
    for (const f of fish) {
      let ax = 0;
      let ay = 0;
      let n = 0;
      let cx = 0;
      let cy = 0;
      let vx = 0;
      let vy = 0;
      for (const o of fish) {
        if (o === f) continue;
        const dx = o.x - f.x;
        const dy = o.y - f.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 70 * 70) continue;
        n++;
        cx += o.x;
        cy += o.y;
        vx += o.vx;
        vy += o.vy;
        // Espaço pessoal: cada peixe na sua célula
        if (d2 < 24 * 24) {
          const d = Math.sqrt(d2) || 1;
          ax -= (dx / d) * (24 - d) * 12;
          ay -= (dy / d) * (24 - d) * 12;
        }
      }
      if (n) {
        ax += (cx / n - f.x) * 0.35; // coesão
        ay += (cy / n - f.y) * 0.35;
        ax += (vx / n - f.vx) * this.align; // alinhamento
        ay += (vy / n - f.vy) * this.align;
      }
      // Leve tremida
      ax += (Math.random() - 0.5) * 60;
      ay += (Math.random() - 0.5) * 40;
      // Bordas: vira suave antes de sair
      const m = 70;
      if (f.x < bounds.left + m) ax += (bounds.left + m - f.x) * 2;
      if (f.x > bounds.right - m) ax -= (f.x - bounds.right + m) * 2;
      if (f.y < bounds.top + m) ay += (bounds.top + m - f.y) * 2;
      if (f.y > bounds.bottom - m) ay -= (f.y - bounds.bottom + m) * 2;
      // Foge dos tubarões (cabeça e meio do corpo)
      for (const s of sharks) {
        for (const t of [0, 0.3]) {
          const i = Math.round(t * (SPINE - 1));
          const dx = f.x - s.body[i * 2];
          const dy = f.y - s.body[i * 2 + 1];
          const reach = s.length * 0.32;
          const d = Math.hypot(dx, dy);
          if (d < reach) {
            ax += (dx / (d || 1)) * 520 * (1 - d / reach);
            ay += (dy / (d || 1)) * 520 * (1 - d / reach);
          }
        }
      }
      // Foge do mouse quando ele mexe a água
      if (pointer.active && pointer.speed > 120) {
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 140) {
          ax += (dx / (d || 1)) * 700 * (1 - d / 140);
          ay += (dy / (d || 1)) * 700 * (1 - d / 140);
        }
      }
      f.vx += ax * dt;
      f.vy += ay * dt * 0.7; // peixe nada mais na horizontal
      const sp = Math.hypot(f.vx, f.vy) || 1;
      const limited = clamp(sp, this.cruise * 0.5, this.cruise * 2.2);
      f.vx = (f.vx / sp) * limited;
      f.vy = (f.vy / sp) * limited;
      // Volta devagar para a velocidade de cruzeiro
      const relax = 1 + (this.cruise / sp - 1) * Math.min(1, dt * 0.8);
      f.vx *= relax;
      f.vy *= relax;
    }
    for (const f of fish) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    }
  }

  draw(grid: Grid) {
    for (const f of this.fish) {
      const sp = Math.hypot(f.vx, f.vy) || 1;
      grid.dot(f.x, f.y, 0.46);
      grid.dot(f.x - (f.vx / sp) * grid.cellW, f.y - (f.vy / sp) * grid.cellW * 0.6, 0.24);
    }
  }
}

// ---------- mundo ----------
export class World {
  time = 0;
  sharks: Shark[] = [];
  schools: School[] = [];
  bounds: Bounds = { left: 0, top: 0, right: 1, bottom: 1 };
  pointer: Pointer = { x: 0, y: 0, speed: 0, active: false };
  private key = "";

  /** Recria a população quando o tamanho da tela muda de faixa */
  resize(width: number, height: number, right = width) {
    this.bounds = { left: 0, top: 0, right, bottom: height };
    const mobile = right < 760;
    const base = mobile ? clamp(right * 0.7, 220, 380) : clamp(Math.min(right * 0.4, height * 0.72), 300, 620);
    const key = `${mobile}-${Math.round(base / 40)}`;
    if (key === this.key) return;
    this.key = key;

    const spawn = (kind: SharkKind, size: number, depth: number, seed: number) =>
      new Shark(
        kind,
        base * size,
        depth,
        right * (0.15 + Math.random() * 0.7),
        height * (0.15 + Math.random() * 0.7),
        Math.random() * TAU,
        seed,
      );
    this.sharks = mobile
      ? [spawn("shark", 1, 0.95, 1.3), spawn("hammerhead", 0.8, 0.7, 4.1)]
      : [spawn("shark", 1, 0.95, 1.3), spawn("hammerhead", 0.82, 0.78, 4.1), spawn("shark", 0.6, 0.55, 7.7)];
    const schools = mobile ? 2 : 3;
    this.schools = Array.from(
      { length: schools },
      (_, i) =>
        new School(
          mobile ? 12 : 16,
          right * (0.2 + 0.6 * Math.random()),
          height * (0.2 + 0.6 * Math.random()),
          36 + i * 8,
          i % 2 === 0 ? 2.4 : 0.8,
        ),
    );
    this.sharks.forEach((s) => s.pose());
  }

  step(dt: number) {
    this.time += dt;
    for (const s of this.sharks) s.update(dt, this);
    for (const school of this.schools) school.update(dt, this);
  }

  draw(grid: Grid) {
    grid.clear();
    for (const school of this.schools) school.draw(grid);
    // Tubarões mais fundos primeiro; os mais perto ficam por cima
    [...this.sharks]
      .sort((a, b) => a.depth - b.depth)
      .forEach((s, i) => {
        grid.layer = i + 1;
        s.draw(grid);
      });
  }
}
