// Shaders (programas da placa de vídeo) do oceano do fundo.

export const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Água: equação de onda numa textura pequena. r = altura agora,
// g = altura no passo anterior. Cada passo: média dos vizinhos menos o
// passado (a onda se espalha) vezes um amortecimento (a onda morre).
// O mouse empurra a água ao longo do caminho que fez desde o último passo;
// por isso o rastro é contínuo, sem pontos soltos.
export const WAVE = `
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uA;          // começo do trecho do mouse (em texels)
uniform vec2 uB;          // fim do trecho
uniform float uStrength;
uniform float uRadius;
uniform vec4 uDrops[4];   // gotas: x, y, raio, força (clique, rastro dos tubarões)
uniform float uDamping;

float splat(vec2 p, vec2 c, float r) {
  vec2 d = p - c;
  return exp(-dot(d, d) / (r * r));
}

void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 s = texture2D(uState, uv).rg;
  float sum = texture2D(uState, uv + vec2(uTexel.x, 0.0)).r
            + texture2D(uState, uv - vec2(uTexel.x, 0.0)).r
            + texture2D(uState, uv + vec2(0.0, uTexel.y)).r
            + texture2D(uState, uv - vec2(0.0, uTexel.y)).r;
  float h = (sum * 0.5 - s.g) * uDamping;

  vec2 p = gl_FragCoord.xy;
  vec2 ab = uB - uA;
  float t = clamp(dot(p - uA, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  h += uStrength * splat(p, uA + ab * t, uRadius);
  for (int i = 0; i < 4; i++) {
    h += uDrops[i].w * splat(p, uDrops[i].xy, uDrops[i].z);
  }
  gl_FragColor = vec4(h, s.r, 0.0, 1.0);
}
`;

// Tela: cada célula da grade vira um caractere do atlas, escolhido pela
// densidade (borda do tubarão = ' : ;, centro = @ 8 #), com um ladrilho
// apagado atrás. A água desloca onde cada pixel lê a grade (refração) e
// acende um brilho em dithering 1-bit nas cristas das ondas.
export const MAIN = `
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform vec2 uCell;
uniform vec2 uGrid;
uniform sampler2D uData;
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;  // variações (colunas), níveis (linhas)
uniform sampler2D uWave;
uniform vec2 uWaveTexel;
uniform float uWaveOn;
uniform float uRefract;
uniform float uShine;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform float uAmount;
uniform float uTime;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 css = vec2(frag.x, uRes.y - frag.y) / uDpr; // px de tela, origem no topo

  // Inclinação da água neste ponto
  vec2 g = vec2(0.0);
  if (uWaveOn > 0.5) {
    vec2 uv = frag / uRes;
    g = vec2(
      texture2D(uWave, uv + vec2(uWaveTexel.x, 0.0)).r - texture2D(uWave, uv - vec2(uWaveTexel.x, 0.0)).r,
      texture2D(uWave, uv + vec2(0.0, uWaveTexel.y)).r - texture2D(uWave, uv - vec2(0.0, uWaveTexel.y)).r
    );
  }
  vec2 p = css + vec2(g.x, -g.y) * uRefract;

  float alpha = 0.0;
  float accent = 0.0;

  // Caracteres
  vec2 cellF = p / uCell;
  vec2 cell = floor(cellF);
  vec2 local = cellF - cell;
  if (cell.x >= 0.0 && cell.y >= 0.0 && cell.x < uGrid.x && cell.y < uGrid.y) {
    vec4 d = texture2D(uData, (cell + 0.5) / uGrid);
    float dens = d.r;
    if (dens > 0.02) {
      float level = clamp(floor(dens * uAtlasGrid.y), 0.0, uAtlasGrid.y - 1.0);
      float variant = floor(hash(cell) * uAtlasGrid.x);
      float glyph = texture2D(uAtlas, (vec2(variant, level) + local) / uAtlasGrid).a;
      vec2 px = local * uCell;
      float tile = step(1.0, px.x) * step(px.x, uCell.x - 1.0) * step(1.0, px.y) * step(px.y, uCell.y - 1.0);
      alpha = max(tile * dens * 0.5, glyph * (0.4 + 0.6 * dens));
      accent = max(step(0.5, d.b), step(hash(cell + 17.3), 0.02) * step(0.55, dens));
    }
  }

  // Partículas na água, à deriva
  vec2 q = p + vec2(uTime * 5.0, -uTime * 2.0);
  vec2 qs = uCell * 2.0;
  vec2 qc = floor(q / qs);
  float hp = hash(qc + 3.1);
  if (hp < 0.05) {
    float r = length((fract(q / qs) - 0.5) * qs);
    float twinkle = 0.55 + 0.45 * sin(uTime * 1.3 + hp * 400.0);
    alpha = max(alpha, (1.0 - smoothstep(0.6, 1.4, r)) * 0.3 * twinkle);
  }

  // Brilho nas cristas das ondas, em dithering (combina com o resto do site)
  // (ondulação bem fraca não acende nada: sem névoa cinza na tela toda)
  float light = max(dot(g, vec2(-0.6, 0.8)) * uShine - 0.12, 0.0) * 1.6;
  float bit = step(bayer8(floor(css / 2.0)) + 0.002, light);
  alpha = max(alpha, bit * 0.45);

  float a = clamp(alpha, 0.0, 1.0) * uAmount;
  vec3 color = mix(uInk, uAccent, accent);
  gl_FragColor = vec4(color * a, a);
}
`;
