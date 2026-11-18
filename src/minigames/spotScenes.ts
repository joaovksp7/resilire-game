// Desenho do mapa de risco (atividade `cena`), feito no código, como os desenhos da mochila.
// O texto de cada ponto fica em content/atividades.json, ligado pelo `id` do ponto.
//
// O mapa é a cidade vista de cima, no mesmo arranjo de src/world/layout.ts: norte em cima, com a
// parte alta a oeste e o morro a leste; no meio, o centro e a baixada; embaixo, a beira-rio e o rio.
// Só formas simples e sem texto. As cores vêm do CSS (classes `mapa__*`, em src/style.css).

/** Largura e altura da área de desenho. Os pontos ficam em % dela. */
const W = 320;
const H = 240;

/**
 * Onde fica cada ponto tocável, em % da largura (x) e da altura (y) do mapa. O ponto do abrigo e o
 * da casa ficam ao lado do desenho, para não cobrir o prédio.
 */
export const SPOT_POSITIONS = {
  abrigo: { x: 22, y: 16 },
  'parte-alta': { x: 40, y: 15 },
  encosta: { x: 82, y: 16 },
  baixada: { x: 47, y: 57 },
  'beira-rio': { x: 20, y: 72 },
  casa: { x: 76, y: 68 },
} as const satisfies Readonly<Record<string, { x: number; y: number }>>;

export type SpotId = keyof typeof SPOT_POSITIONS;
export const SPOT_IDS = Object.keys(SPOT_POSITIONS) as SpotId[];

const rect = (cls: string, x: number, y: number, w: number, h: number): string =>
  `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const street = (x1: number, y1: number, x2: number, y2: number): string =>
  `<line class="mapa__rua" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;

/** Casinhas espalhadas (canto de cima à esquerda de cada uma). */
const HOUSES: readonly (readonly [number, number])[] = [
  [20, 62], [40, 66], [110, 26], [130, 66], [160, 26], [160, 66],
  [200, 98], [225, 125], [255, 98], [20, 126], [45, 140], [110, 126], [110, 98],
  [200, 140], [40, 152], [100, 152], [205, 152],
  [30, 226], [75, 226], [125, 226], [215, 226], [265, 226],
];

/** O mapa como <svg>, sem os pontos (eles são botões por cima, posicionados por SPOT_POSITIONS). */
export function riskMapSvg(className: string): string {
  const parts = [
    rect('mapa__grama', 0, 0, W, H),
    // Morro a nordeste, com a mata.
    '<path class="mapa__morro" d="M178 84 L205 44 L228 56 L262 10 L292 30 L320 18 L320 84 Z"/>',
    ...[[222, 64], [250, 44], [270, 66], [292, 52], [306, 70]].map(([cx, cy]) => `<circle class="mapa__mata" cx="${cx}" cy="${cy}" r="8"/>`),
    // Ruas: as da parte alta, a rua principal, a da baixada e a da beira-rio.
    street(10, 18, 186, 18),
    street(10, 18, 10, 172),
    street(92, 18, 92, 58),
    street(10, 58, 186, 58),
    street(186, 18, 186, 118),
    street(186, 92, 312, 92),
    street(10, 118, 312, 118),
    street(150, 118, 150, 172),
    street(10, 172, 312, 172),
    street(10, 226, 312, 226),
    // Margens e rio, com a ponte.
    rect('mapa__margem', 0, 182, W, 8),
    rect('mapa__rio', 0, 190, W, 22),
    rect('mapa__margem', 0, 212, W, 6),
    '<rect class="mapa__ponte" x="174" y="180" width="12" height="40"/>',
    // Casas.
    ...HOUSES.map(([x, y]) => rect('mapa__casa', x, y, 14, 12)),
    // Abrigo (prédio grande na parte alta) e a casa do jogador (na beira-rio, com telhado).
    rect('mapa__abrigo', 14, 26, 30, 24),
    '<path class="mapa__lar" d="M282 160 L292 150 L302 160 V170 H282 Z"/>',
  ];
  return `<svg class="${className}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
}
