import {
  Box3,
  type BufferGeometry,
  Color,
  InstancedMesh,
  MathUtils,
  type Material,
  Matrix4,
  MeshLambertMaterial,
  type Object3D,
  Ray,
  Vector3,
} from 'three';
import { CAMERA } from '../config';

// Casas, prédios comuns e árvores que ficam na frente do nome de uma rua ou de uma casa destacada pelo dado
// ficam semitransparentes, e o toque passa por eles (src/player/clickToMove.ts).

/** Opacidade do que está apagado: dá para ver o que está atrás e ainda reconhecer o objeto. */
export const FADE_OPACITY = 0.35;
/** Desenhado depois do chão, dos nomes das ruas, dos destaques do dado e da chuva. */
const FADE_RENDER_ORDER = 4;

/**
 * Quanto um objeto precisa tapar para ficar apagado (quem só encosta na borda continua normal):
 * a fração dos pontos de um nome de rua e quantos dos 9 pontos (grade 3×3) de uma casa destacada.
 */
export const LABEL_COVER_SHARE = 0.3;
export const CELL_COVER_POINTS = 4;

/** Os pontos de uma coisa que não pode ficar tapada (um nome de rua, uma casa) e quantos precisam estar tapados. */
export interface PointGroup {
  readonly points: readonly Vector3[];
  readonly min: number;
}

/** Marca no userData de um objeto apagado: o toque passa por ele. */
export function isFaded(object: Object3D): boolean {
  return object.userData.faded === true;
}

/** Cópia transparente de um material, para o objeto apagado. */
export function fadedMaterial<T extends Material>(material: T): T {
  const faded = material.clone();
  faded.transparent = true;
  faded.opacity = FADE_OPACITY;
  faded.depthWrite = false;
  return faded;
}

/** Algo que pode tapar a vista: a caixa que ocupa no mundo e como apagar/voltar ao normal. */
export interface Occluder {
  readonly box: Box3;
  setFaded(faded: boolean): void;
}

/**
 * Um tipo de objeto repetido (casas, copas…) em dois InstancedMesh: o normal e o apagado.
 * Cada objeto fica em um dos dois; `commit()` refaz as listas depois das mudanças.
 */
export class FadeableInstances {
  readonly solid: InstancedMesh;
  readonly faded: InstancedMesh;
  private readonly matrices: Matrix4[];
  private readonly colors: Color[];
  private readonly flags: boolean[];
  private readonly geometry: BufferGeometry;
  private dirty = true;

  constructor(geometry: BufferGeometry, items: readonly { matrix: Matrix4; color: number }[], name: string) {
    this.geometry = geometry;
    this.matrices = items.map((it) => it.matrix);
    this.colors = items.map((it) => new Color(it.color));
    this.flags = items.map(() => false);
    const size = Math.max(1, items.length);
    this.solid = new InstancedMesh(geometry, new MeshLambertMaterial(), size);
    this.solid.name = name;
    this.faded = new InstancedMesh(geometry, fadedMaterial(new MeshLambertMaterial()), size);
    this.faded.name = `${name}-apagados`;
    this.faded.renderOrder = FADE_RENDER_ORDER;
    this.faded.userData.faded = true;
    this.commit();
  }

  get count(): number {
    return this.matrices.length;
  }

  /** Caixa do objeto `index` no mundo. */
  boxOf(index: number, target = new Box3()): Box3 {
    if (!this.geometry.boundingBox) this.geometry.computeBoundingBox();
    return target.copy(this.geometry.boundingBox as Box3).applyMatrix4(this.matrices[index]);
  }

  setFaded(index: number, faded: boolean): void {
    if (this.flags[index] === faded) return;
    this.flags[index] = faded;
    this.dirty = true;
  }

  commit(): void {
    if (!this.dirty) return;
    this.dirty = false;
    let solid = 0;
    let faded = 0;
    this.matrices.forEach((matrix, i) => {
      const mesh = this.flags[i] ? this.faded : this.solid;
      const slot = this.flags[i] ? faded++ : solid++;
      mesh.setMatrixAt(slot, matrix);
      mesh.setColorAt(slot, this.colors[i]);
    });
    for (const [mesh, count] of [
      [this.solid, solid],
      [this.faded, faded],
    ] as const) {
      mesh.count = count;
      mesh.visible = count > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // Usada pelo corte de câmera e pelo toque: tem que acompanhar quem ficou em cada lista.
      mesh.computeBoundingSphere();
    }
  }
}

/** Direção do chão para a câmera (a câmera é ortográfica e não gira: vale para a tela toda). */
const TOWARD_CAMERA = (() => {
  const yaw = MathUtils.degToRad(CAMERA.yawDeg);
  const pitch = MathUtils.degToRad(CAMERA.pitchDeg);
  return new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).normalize();
})();

const coverRay = new Ray(new Vector3(), TOWARD_CAMERA.clone());

/** A caixa fica entre o ponto e a câmera (tapa o ponto na tela)? */
export function covers(box: Box3, point: Vector3): boolean {
  // Só o que está mais alto que o ponto pode tapá-lo.
  if (box.max.y <= point.y) return false;
  coverRay.origin.copy(point);
  return coverRay.intersectsBox(box);
}

/**
 * Decide quem fica apagado: o que tapa os nomes das ruas (sempre) e o que tapa as casas destacadas
 * pelo dado (só enquanto elas aparecem).
 */
export class Fader {
  private readonly occluders: Occluder[] = [];
  private readonly commits: (() => void)[] = [];
  private fixed = new Set<number>();
  private current = new Set<number>();

  add(occluder: Occluder): void {
    this.occluders.push(occluder);
  }

  /** Chamado depois de cada mudança (ex.: refazer as listas dos objetos repetidos). */
  onCommit(fn: () => void): void {
    this.commits.push(fn);
  }

  /** Quem tapa boa parte de algum destes grupos fica apagado o tempo todo (os nomes das ruas). */
  setFixedGroups(groups: readonly PointGroup[]): void {
    this.apply(this.covering(groups), this.current);
  }

  /** Quem tapa boa parte de algum destes grupos fica apagado até a próxima chamada (as casas destacadas). */
  setGroups(groups: readonly PointGroup[]): void {
    this.apply(this.fixed, this.covering(groups));
  }

  private covering(groups: readonly PointGroup[]): Set<number> {
    const hit = new Set<number>();
    this.occluders.forEach((occluder, i) => {
      const { box } = occluder;
      for (const group of groups) {
        let covered = 0;
        for (const p of group.points) {
          if (covers(box, p) && ++covered >= group.min) {
            hit.add(i);
            return;
          }
        }
      }
    });
    return hit;
  }

  private apply(fixed: Set<number>, dynamic: Set<number>): void {
    const was = new Set([...this.current, ...this.fixed]);
    this.fixed = fixed;
    this.current = dynamic;
    this.occluders.forEach((occluder, i) => {
      const now = fixed.has(i) || dynamic.has(i);
      if (now !== was.has(i)) occluder.setFaded(now);
    });
    for (const fn of this.commits) fn();
  }
}
