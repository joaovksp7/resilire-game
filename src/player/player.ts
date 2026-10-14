import { type Group, Vector3 } from 'three';
import { PLAYER } from '../config';
import type { FollowTarget } from '../core/camera';
import type { CityMap } from '../world/cityMap';
import { type Character, prefersReducedMotion } from './character';
import type { Cell } from './pathfinding';

export type ArriveListener = (cell: Cell) => void;

/** Menor diferença entre dois ângulos (radianos), de −π a π. */
function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * Posição e movimento do personagem pela cidade.
 * Anda de centro em centro de tile seguindo o caminho, na altura do chão (ou da ponte).
 */
export class Player implements FollowTarget {
  private readonly map: CityMap;
  private readonly character: Character;
  private readonly waypoints: Vector3[] = [];
  private readonly arriveListeners: ArriveListener[] = [];
  private yaw = 0;
  private targetYaw = 0;
  /** Para onde virar ao chegar (ex.: de frente para a porta). */
  private finalYaw: number | null = null;
  private destination: Cell | null = null;
  /** Comprimento do trecho atual (de casa em casa), para o pulinho. */
  private segmentLength = 0;

  constructor(map: CityMap, character: Character) {
    this.map = map;
    this.character = character;
  }

  get object(): Group {
    return this.character.root;
  }

  get position(): Vector3 {
    return this.character.root.position;
  }

  get isMoving(): boolean {
    return this.waypoints.length > 0;
  }

  /** Tile onde o personagem está agora. */
  get cell(): Cell | null {
    return this.map.worldToTile(this.position.x, this.position.z);
  }

  /** Chamado quando o personagem chega ao fim de um caminho. */
  onArrive(listener: ArriveListener): void {
    this.arriveListeners.push(listener);
  }

  /** Coloca o personagem no centro de um tile, parado. `yaw` = direção em que fica virado. */
  placeAt(col: number, row: number, yaw = this.yaw): void {
    const x = this.map.colToX(col + 0.5);
    const z = this.map.rowToZ(row + 0.5);
    this.position.set(x, this.map.walkHeightAt(x, z), z);
    this.waypoints.length = 0;
    this.destination = null;
    this.yaw = this.targetYaw = yaw;
    this.character.root.rotation.y = yaw;
  }

  /**
   * Segue um caminho de tiles (o primeiro costuma ser o tile atual).
   * `faceYaw`: se informado, vira para essa direção ao chegar.
   */
  walk(path: readonly Cell[], faceYaw: number | null = null): void {
    this.waypoints.length = 0;
    this.finalYaw = faceYaw;
    this.destination = path.length > 0 ? path[path.length - 1] : null;

    const points = path.map((c) => new Vector3(this.map.colToX(c.col + 0.5), 0, this.map.rowToZ(c.row + 0.5)));
    // Se já passamos do centro do primeiro tile rumo ao segundo, não volta para trás.
    if (points.length >= 2) {
      const toSecond = this.position.distanceToSquared(points[1].clone().setY(this.position.y));
      const firstToSecond = points[0].distanceToSquared(points[1]);
      if (toSecond <= firstToSecond) points.shift();
    }
    this.waypoints.push(...points);
    this.segmentLength = this.waypoints.length > 0 ? this.distanceTo(this.waypoints[0]) : 0;

    if (this.waypoints.length === 0 && this.destination) this.arrive();
  }

  stop(): void {
    this.waypoints.length = 0;
    this.destination = null;
  }

  update(dt: number): void {
    let remaining = PLAYER.speed * dt;

    while (remaining > 0 && this.waypoints.length > 0) {
      const target = this.waypoints[0];
      const dx = target.x - this.position.x;
      const dz = target.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1e-4) this.targetYaw = Math.atan2(dx, dz);

      if (dist <= remaining) {
        this.position.x = target.x;
        this.position.z = target.z;
        remaining -= dist;
        this.waypoints.shift();
        if (this.waypoints.length === 0) this.arrive();
        else this.segmentLength = this.distanceTo(this.waypoints[0]);
      } else {
        this.position.x += (dx / dist) * remaining;
        this.position.z += (dz / dist) * remaining;
        remaining = 0;
      }
    }

    this.position.y = this.map.walkHeightAt(this.position.x, this.position.z);

    const turn = 1 - Math.exp(-PLAYER.turnSharpness * dt);
    this.yaw += angleDelta(this.yaw, this.targetYaw) * turn;
    this.character.root.rotation.y = this.yaw;
    this.character.update(dt, this.isMoving, this.hop());
  }

  /** Altura do pulinho agora: sobe e desce uma vez a cada casa. */
  private hop(): number {
    if (!this.isMoving || this.segmentLength <= 1e-4 || prefersReducedMotion()) return 0;
    const progress = 1 - this.distanceTo(this.waypoints[0]) / this.segmentLength;
    return Math.sin(Math.PI * Math.min(1, Math.max(0, progress))) * PLAYER.hopHeight;
  }

  private distanceTo(point: Vector3): number {
    return Math.hypot(point.x - this.position.x, point.z - this.position.z);
  }

  private arrive(): void {
    if (this.finalYaw !== null) this.targetYaw = this.finalYaw;
    const cell = this.destination;
    this.destination = null;
    if (cell) for (const listener of this.arriveListeners) listener(cell);
  }
}
