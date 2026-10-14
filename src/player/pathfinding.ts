// Caminhos em grade de tiles, 4 direções (1 casa por passo).
// Não depende do Three.js nem do mapa: recebe só uma grade.

export interface Cell {
  readonly col: number;
  readonly row: number;
}

export interface WalkGrid {
  readonly cols: number;
  readonly rows: number;
  isWalkable(col: number, row: number): boolean;
}

const DIRS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Custo extra por curva: entre caminhos do mesmo tamanho, prefere o com menos curvas. */
const TURN_COST = 0.1;

/** Fila de prioridade mínima (heap binário) com chaves numéricas. */
class MinHeap {
  private readonly items: number[] = [];
  private readonly scores: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, score: number): void {
    const { items, scores } = this;
    let i = items.length;
    items.push(item);
    scores.push(score);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (scores[parent] <= scores[i]) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      [scores[i], scores[parent]] = [scores[parent], scores[i]];
      i = parent;
    }
  }

  pop(): number {
    const { items, scores } = this;
    const top = items[0];
    const lastItem = items.pop() as number;
    const lastScore = scores.pop() as number;
    if (items.length > 0) {
      items[0] = lastItem;
      scores[0] = lastScore;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && scores[l] < scores[m]) m = l;
        if (r < items.length && scores[r] < scores[m]) m = r;
        if (m === i) break;
        [items[i], items[m]] = [items[m], items[i]];
        [scores[i], scores[m]] = [scores[m], scores[i]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Caminho de `start` até `goal` (incluindo os dois), ou null se não houver.
 * O estado inclui a direção de chegada, para poder cobrar as curvas.
 */
export function findPath(grid: WalkGrid, start: Cell, goal: Cell): Cell[] | null {
  const { cols, rows } = grid;
  const inside = (c: number, r: number): boolean => c >= 0 && r >= 0 && c < cols && r < rows;
  if (!inside(start.col, start.row) || !inside(goal.col, goal.row)) return null;
  if (!grid.isWalkable(goal.col, goal.row)) return null;
  if (start.col === goal.col && start.row === goal.row) return [start];

  // Estado = célula * 5 + direção (0–3), ou 4 = ponto de partida.
  const states = cols * rows * 5;
  const cost = new Float64Array(states).fill(Infinity);
  const cameFrom = new Int32Array(states).fill(-1);
  const closed = new Uint8Array(states);
  const open = new MinHeap();
  const h = (c: number, r: number): number => Math.abs(c - goal.col) + Math.abs(r - goal.row);

  const startState = (start.row * cols + start.col) * 5 + 4;
  cost[startState] = 0;
  open.push(startState, h(start.col, start.row));

  while (open.size > 0) {
    const state = open.pop();
    if (closed[state]) continue;
    closed[state] = 1;

    const cell = Math.floor(state / 5);
    const dir = state % 5;
    const col = cell % cols;
    const row = Math.floor(cell / cols);

    if (col === goal.col && row === goal.row) {
      const path: Cell[] = [];
      for (let s = state; s !== -1; s = cameFrom[s]) {
        const c = Math.floor(s / 5);
        path.push({ col: c % cols, row: Math.floor(c / cols) });
      }
      return path.reverse();
    }

    for (let d = 0; d < 4; d++) {
      const nc = col + DIRS[d][0];
      const nr = row + DIRS[d][1];
      if (!inside(nc, nr) || !grid.isWalkable(nc, nr)) continue;
      const next = (nr * cols + nc) * 5 + d;
      if (closed[next]) continue;
      const g = cost[state] + 1 + (dir !== 4 && dir !== d ? TURN_COST : 0);
      if (g < cost[next]) {
        cost[next] = g;
        cameFrom[next] = state;
        open.push(next, g + h(nc, nr));
      }
    }
  }
  return null;
}

export interface Reach {
  /** Número do dado usado nesta busca. */
  readonly maxSteps: number;
  /** Casas alcançáveis (sem a de partida), na ordem em que foram encontradas. */
  readonly cells: readonly Cell[];
  /** Passos até a casa, ou undefined se ela não estiver ao alcance. */
  stepsTo(col: number, row: number): number | undefined;
  /** Caminho mais curto da partida até a casa (incluindo as duas), ou null. */
  pathTo(col: number, row: number): Cell[] | null;
}

/**
 * Todas as casas que dá para alcançar com até `maxSteps` passos (4 direções, 1 casa por passo).
 * Busca em largura: cada casa guarda o menor número de passos e de onde veio.
 */
export function reachableTiles(grid: WalkGrid, start: Cell, maxSteps: number): Reach {
  const { cols, rows } = grid;
  const steps = new Map<number, number>();
  const prev = new Map<number, number>();
  const key = (c: number, r: number): number => r * cols + c;
  const startKey = key(start.col, start.row);
  steps.set(startKey, 0);
  const queue = [startKey];
  const cells: Cell[] = [];

  for (let qi = 0; qi < queue.length; qi++) {
    const k = queue[qi];
    const d = steps.get(k) as number;
    if (d >= maxSteps) continue;
    const col = k % cols;
    const row = Math.floor(k / cols);
    for (const [dc, dr] of DIRS) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const nk = key(nc, nr);
      if (steps.has(nk) || !grid.isWalkable(nc, nr)) continue;
      steps.set(nk, d + 1);
      prev.set(nk, k);
      queue.push(nk);
      cells.push({ col: nc, row: nr });
    }
  }

  return {
    maxSteps,
    cells,
    stepsTo: (col, row) => (key(col, row) === startKey ? undefined : steps.get(key(col, row))),
    pathTo: (col, row) => {
      let k = key(col, row);
      if (!steps.has(k) || k === startKey) return null;
      const path: Cell[] = [];
      for (;;) {
        path.push({ col: k % cols, row: Math.floor(k / cols) });
        const p = prev.get(k);
        if (p === undefined) break;
        k = p;
      }
      return path.reverse();
    },
  };
}
