import { BufferAttribute, BufferGeometry, Color, Mesh, MeshBasicMaterial } from 'three';
import type { CityMap } from '../world/cityMap';
import { prefersReducedMotion } from './character';
import type { Cell } from './pathfinding';

/** Azul bem claro: aparece tanto no cinza da rua quanto no bege da praça. */
const NORMAL_COLOR = 0xa8e6ff;
/** Cor das casas especiais (ex.: porta da instituição da missão, na Fase 4). */
const SPECIAL_COLOR = 0xffc23d;
/** Quanto o quadrado fica para dentro da borda do tile (fração do tile). */
const INSET = 0.12;
const LIFT = 0.05;

/**
 * Quadrados claros no chão marcando as casas que dá para alcançar com o dado.
 * Uma malha só, refeita a cada jogada, que acompanha a ladeira e o piso da ponte.
 */
export class ReachHighlight {
  readonly mesh: Mesh;
  private readonly map: CityMap;
  private readonly material: MeshBasicMaterial;
  private time = 0;

  constructor(map: CityMap) {
    this.map = map;
    this.material = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.mesh = new Mesh(new BufferGeometry(), this.material);
    this.mesh.name = 'casas-alcancaveis';
    this.mesh.visible = false;
    this.mesh.renderOrder = 1;
  }

  /** Mostra as casas. `isSpecial` pinta algumas de outra cor. */
  show(cells: readonly Cell[], isSpecial?: (cell: Cell) => boolean): void {
    const { map } = this;
    const ts = map.tileSize;
    const positions = new Float32Array(cells.length * 6 * 3);
    const colors = new Float32Array(cells.length * 6 * 3);
    const color = new Color();
    let p = 0;

    for (const cell of cells) {
      color.setHex(isSpecial?.(cell) ? SPECIAL_COLOR : NORMAL_COLOR);
      const x0 = map.colToX(cell.col) + ts * INSET;
      const x1 = map.colToX(cell.col + 1) - ts * INSET;
      const z0 = map.rowToZ(cell.row) + ts * INSET;
      const z1 = map.rowToZ(cell.row + 1) - ts * INSET;
      const h = (x: number, z: number): number => map.walkHeightAt(x, z) + LIFT;
      // Mesma ordem de triângulos do terreno: (NO, SO, SE) e (NO, SE, NE).
      const quad: [number, number][] = [
        [x0, z0],
        [x0, z1],
        [x1, z1],
        [x0, z0],
        [x1, z1],
        [x1, z0],
      ];
      for (const [x, z] of quad) {
        positions[p] = x;
        positions[p + 1] = h(x, z);
        positions[p + 2] = z;
        colors[p] = color.r;
        colors[p + 1] = color.g;
        colors[p + 2] = color.b;
        p += 3;
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.mesh.visible = cells.length > 0;
    this.time = 0;
  }

  hide(): void {
    this.mesh.visible = false;
  }

  update(dt: number): void {
    if (!this.mesh.visible) return;
    if (prefersReducedMotion()) {
      this.material.opacity = 0.7;
      return;
    }
    this.time += dt;
    this.material.opacity = 0.68 + Math.sin(this.time * 3) * 0.14;
  }
}
