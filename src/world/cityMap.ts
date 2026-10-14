import { Vector3 } from 'three';
import { WORLD } from '../config';
import { INSTITUTION_IDS, type InstitutionId } from './institutions';
import { LAYOUT_LEVELS, LAYOUT_TYPES, LEGEND, type TileKind } from './layout';

export type Side = 'north' | 'south' | 'east' | 'west';

export interface Tile {
  readonly col: number;
  readonly row: number;
  readonly kind: TileKind;
  /** Nível do terreno (0 = fundo do rio). */
  readonly level: number;
  /** Rua, praça ou ponte. */
  readonly walkable: boolean;
  readonly institution?: InstitutionId;
}

export interface InstitutionSite {
  readonly id: InstitutionId;
  readonly minCol: number;
  readonly maxCol: number;
  readonly minRow: number;
  readonly maxRow: number;
  /** Tile de rua em frente à porta. */
  readonly door: { col: number; row: number };
  /** Lado do prédio onde fica a porta. */
  readonly doorSide: Side;
}

export interface Bridge {
  readonly tiles: readonly Tile[];
  readonly minCol: number;
  readonly maxCol: number;
  readonly minRow: number;
  readonly maxRow: number;
  /** true = atravessa no sentido norte–sul. */
  readonly northSouth: boolean;
  /** Altura (mundo) do piso da ponte: a das ruas nas pontas, um pouco acima. */
  readonly deckY: number;
}

const WALKABLE: ReadonlySet<TileKind> = new Set(['street', 'plaza', 'bridge']);

/**
 * Número "aleatório" fixo entre 0 e 1 para um tile. A cidade sai sempre igual,
 * mas com variação de tamanho, cor e posição entre casas e árvores.
 */
export function tileNoise(col: number, row: number, salt = 0): number {
  let h = Math.imul(col + 1, 374761393) + Math.imul(row + 1, 668265263) + Math.imul(salt + 1, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Grade de tiles da cidade, lida de src/world/layout.ts.
 * Coordenadas do mundo: x cresce para leste (colunas), z cresce para sul (linhas), centro do mapa em (0, 0).
 */
export class CityMap {
  readonly cols: number;
  readonly rows: number;
  readonly tileSize = WORLD.tileSize;
  readonly tiles: readonly Tile[];
  readonly sites: ReadonlyMap<InstitutionId, InstitutionSite>;
  readonly bridges: readonly Bridge[];
  /** Altura (mundo) de cada canto de tile: (cols + 1) × (rows + 1). */
  private readonly corners: Float32Array;
  private readonly bridgeByTile = new Map<Tile, Bridge>();

  constructor(tiles: Tile[], cols: number, rows: number, sites: Map<InstitutionId, InstitutionSite>) {
    this.tiles = tiles;
    this.cols = cols;
    this.rows = rows;
    this.sites = sites;
    this.corners = this.computeCorners();
    this.bridges = this.computeBridges();
  }

  /** Metade do lado maior do mapa (unidades do mundo). */
  get halfSize(): number {
    return (Math.max(this.cols, this.rows) * this.tileSize) / 2;
  }

  tile(col: number, row: number): Tile | undefined {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return undefined;
    return this.tiles[row * this.cols + col];
  }

  /** Posição x do canto oeste da coluna (ou do centro, com +0.5). */
  colToX(col: number): number {
    return (col - this.cols / 2) * this.tileSize;
  }

  rowToZ(row: number): number {
    return (row - this.rows / 2) * this.tileSize;
  }

  worldToTile(x: number, z: number): { col: number; row: number } | null {
    const col = Math.floor(x / this.tileSize + this.cols / 2);
    const row = Math.floor(z / this.tileSize + this.rows / 2);
    return this.tile(col, row) ? { col, row } : null;
  }

  /** Centro do tile, com y na altura do terreno. */
  tileCenter(col: number, row: number, target = new Vector3()): Vector3 {
    const x = this.colToX(col + 0.5);
    const z = this.rowToZ(row + 0.5);
    return target.set(x, this.heightAt(x, z), z);
  }

  /** Altura (mundo) do canto (i, j), com i em 0..cols e j em 0..rows. */
  cornerHeight(i: number, j: number): number {
    const ci = Math.min(Math.max(i, 0), this.cols);
    const cj = Math.min(Math.max(j, 0), this.rows);
    return this.corners[cj * (this.cols + 1) + ci];
  }

  /**
   * Altura do terreno em (x, z). Usa a mesma divisão em triângulos do terrain.ts
   * (diagonal do canto noroeste para o sudeste), para bater exatamente com o que aparece.
   */
  heightAt(x: number, z: number): number {
    const fx = Math.min(Math.max(x / this.tileSize + this.cols / 2, 0), this.cols - 1e-6);
    const fz = Math.min(Math.max(z / this.tileSize + this.rows / 2, 0), this.rows - 1e-6);
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const h00 = this.cornerHeight(i, j);
    const h10 = this.cornerHeight(i + 1, j);
    const h01 = this.cornerHeight(i, j + 1);
    const h11 = this.cornerHeight(i + 1, j + 1);
    if (u >= v) return h00 + u * (h10 - h00) + v * (h11 - h10);
    return h00 + v * (h01 - h00) + u * (h11 - h01);
  }

  /** Altura do chão para quem anda: o terreno, ou o piso da ponte em cima do rio. */
  walkHeightAt(x: number, z: number): number {
    const cell = this.worldToTile(x, z);
    const tile = cell && this.tile(cell.col, cell.row);
    const bridge = tile && this.bridgeByTile.get(tile);
    return bridge ? bridge.deckY : this.heightAt(x, z);
  }

  bridgeAt(col: number, row: number): Bridge | undefined {
    const tile = this.tile(col, row);
    return tile && this.bridgeByTile.get(tile);
  }

  /**
   * Tile caminhável mais perto do ponto (x, z), procurando até `radius` tiles em volta.
   * `isBlocked` permite excluir tiles extras (ex.: ruas alagadas, na Fase 5).
   */
  nearestWalkable(
    x: number,
    z: number,
    radius: number,
    isBlocked?: (col: number, row: number) => boolean,
  ): { col: number; row: number } | null {
    const fc = Math.floor(x / this.tileSize + this.cols / 2);
    const fr = Math.floor(z / this.tileSize + this.rows / 2);
    let best: { col: number; row: number } | null = null;
    let bestDist = Infinity;
    for (let row = fr - radius; row <= fr + radius; row++) {
      for (let col = fc - radius; col <= fc + radius; col++) {
        const tile = this.tile(col, row);
        if (!tile?.walkable || isBlocked?.(col, row)) continue;
        const dx = this.colToX(col + 0.5) - x;
        const dz = this.rowToZ(row + 0.5) - z;
        const dist = dx * dx + dz * dz;
        if (dist < bestDist) {
          bestDist = dist;
          best = { col, row };
        }
      }
    }
    return best;
  }

  /** Menor altura entre os 4 cantos do tile (para assentar casas em encosta). */
  tileMinHeight(col: number, row: number): number {
    return Math.min(
      this.cornerHeight(col, row),
      this.cornerHeight(col + 1, row),
      this.cornerHeight(col, row + 1),
      this.cornerHeight(col + 1, row + 1),
    );
  }

  /** Junta tiles de ponte vizinhos e calcula a altura do piso de cada ponte. */
  private computeBridges(): Bridge[] {
    const bridges: Bridge[] = [];
    for (const start of this.tiles) {
      if (start.kind !== 'bridge' || this.bridgeByTile.has(start)) continue;
      const group: Tile[] = [];
      const stack = [start];
      const seen = new Set<Tile>([start]);
      while (stack.length > 0) {
        const t = stack.pop() as Tile;
        group.push(t);
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const n = this.tile(t.col + dc, t.row + dr);
          if (n && n.kind === 'bridge' && !seen.has(n)) {
            seen.add(n);
            stack.push(n);
          }
        }
      }

      const minCol = Math.min(...group.map((t) => t.col));
      const maxCol = Math.max(...group.map((t) => t.col));
      const minRow = Math.min(...group.map((t) => t.row));
      const maxRow = Math.max(...group.map((t) => t.row));
      const northSouth = maxRow - minRow >= maxCol - minCol;
      const ends = northSouth
        ? [this.tile(minCol, minRow - 1), this.tile(minCol, maxRow + 1)]
        : [this.tile(minCol - 1, minRow), this.tile(maxCol + 1, minRow)];
      const endHeights = ends
        .filter((t): t is Tile => !!t)
        .map((t) => this.heightAt(this.colToX(t.col + 0.5), this.rowToZ(t.row + 0.5)));
      const deckY = Math.max(...endHeights, 0) + 0.08;

      const bridge: Bridge = { tiles: group, minCol, maxCol, minRow, maxRow, northSouth, deckY };
      for (const t of group) this.bridgeByTile.set(t, bridge);
      bridges.push(bridge);
    }
    return bridges;
  }

  /** Canto = média dos níveis dos até 4 tiles que o tocam. Deixa as encostas suaves. */
  private computeCorners(): Float32Array {
    const out = new Float32Array((this.cols + 1) * (this.rows + 1));
    for (let j = 0; j <= this.rows; j++) {
      for (let i = 0; i <= this.cols; i++) {
        let sum = 0;
        let n = 0;
        for (const [c, r] of [
          [i - 1, j - 1],
          [i, j - 1],
          [i - 1, j],
          [i, j],
        ]) {
          const t = this.tile(c, r);
          if (t) {
            sum += t.level;
            n++;
          }
        }
        out[j * (this.cols + 1) + i] = (sum / n) * WORLD.levelHeight;
      }
    }
    return out;
  }
}

function fail(message: string): never {
  throw new Error(`Mapa da cidade (src/world/layout.ts): ${message}`);
}

/** Lê o layout, confere se está consistente e monta o CityMap. */
export function parseCityMap(types: readonly string[] = LAYOUT_TYPES, levels: readonly string[] = LAYOUT_LEVELS): CityMap {
  const rows = types.length;
  const cols = types[0]?.length ?? 0;
  if (rows === 0 || cols === 0) fail('o mapa está vazio.');
  if (levels.length !== rows) fail(`TIPOS tem ${rows} linhas e NÍVEIS tem ${levels.length}.`);

  const tiles: Tile[] = [];
  const doors: { col: number; row: number }[] = [];

  for (let row = 0; row < rows; row++) {
    if (types[row].length !== cols) fail(`a linha ${row} de TIPOS tem ${types[row].length} caracteres (esperado ${cols}).`);
    if (levels[row].length !== cols) fail(`a linha ${row} de NÍVEIS tem ${levels[row].length} caracteres (esperado ${cols}).`);
    for (let col = 0; col < cols; col++) {
      const char = types[row][col];
      const entry = LEGEND[char];
      if (!entry) fail(`caractere "${char}" desconhecido na linha ${row}, coluna ${col}.`);
      const level = Number(levels[row][col]);
      if (!Number.isInteger(level)) fail(`nível "${levels[row][col]}" inválido na linha ${row}, coluna ${col}.`);
      tiles.push({
        col,
        row,
        kind: entry.kind,
        level,
        walkable: WALKABLE.has(entry.kind),
        institution: entry.institution,
      });
      if (entry.door) doors.push({ col, row });
    }
  }

  const at = (col: number, row: number): Tile | undefined =>
    col >= 0 && row >= 0 && col < cols && row < rows ? tiles[row * cols + col] : undefined;

  // Blocos de instituição: precisam ser retângulos completos.
  const sites = new Map<InstitutionId, InstitutionSite>();
  for (const id of INSTITUTION_IDS) {
    const own = tiles.filter((t) => t.institution === id);
    if (own.length === 0) fail(`a instituição "${id}" não aparece no mapa.`);
    const minCol = Math.min(...own.map((t) => t.col));
    const maxCol = Math.max(...own.map((t) => t.col));
    const minRow = Math.min(...own.map((t) => t.row));
    const maxRow = Math.max(...own.map((t) => t.row));
    if ((maxCol - minCol + 1) * (maxRow - minRow + 1) !== own.length) {
      fail(`o bloco da instituição "${id}" precisa ser um retângulo.`);
    }

    const touching = doors.filter(
      (d) =>
        (d.col >= minCol && d.col <= maxCol && (d.row === minRow - 1 || d.row === maxRow + 1)) ||
        (d.row >= minRow && d.row <= maxRow && (d.col === minCol - 1 || d.col === maxCol + 1)),
    );
    if (touching.length !== 1) {
      fail(`a instituição "${id}" precisa de exatamente um "*" encostado (encontrei ${touching.length}).`);
    }
    const door = touching[0];
    const doorSide: Side =
      door.row > maxRow ? 'south' : door.row < minRow ? 'north' : door.col > maxCol ? 'east' : 'west';
    sites.set(id, { id, minCol, maxCol, minRow, maxRow, door, doorSide });
  }

  // Toda porta precisa pertencer a alguma instituição.
  for (const d of doors) {
    const neighbors = [at(d.col + 1, d.row), at(d.col - 1, d.row), at(d.col, d.row + 1), at(d.col, d.row - 1)];
    if (!neighbors.some((t) => t?.institution)) {
      fail(`o "*" da linha ${d.row}, coluna ${d.col} não encosta em nenhuma instituição.`);
    }
  }

  return new CityMap(tiles, cols, rows, sites);
}
