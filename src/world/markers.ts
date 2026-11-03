import {
  type BufferGeometry,
  Color,
  ConeGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  RingGeometry,
  MeshBasicMaterial,
  SphereGeometry,
  type Vector3,
} from 'three';
import { TEAM } from '../config';
import { prefersReducedMotion } from '../player/character';

export interface MarkerTarget {
  /** Onde a seta flutua (acima da placa da instituição). */
  anchor: Vector3;
  /** Porta da instituição, onde fica o anel. */
  door: Vector3;
  color: number;
}

/** Formas iguais para todos os marcadores. */
interface MarkerShapes {
  tip: BufferGeometry;
  head: BufferGeometry;
  ring: BufferGeometry;
}

/**
 * Marcador de uma missão: uma seta grande na cor da instituição, flutuando acima da placa,
 * e um anel no chão em frente à porta. Pula de leve (parado com prefers-reduced-motion).
 */
class Marker {
  readonly arrow = new Group();
  readonly ring: Mesh;
  private readonly arrowMaterial = new MeshLambertMaterial({ color: 0xffffff, emissive: 0x000000 });
  private readonly ringMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  private baseY = 0;

  constructor(shapes: MarkerShapes) {
    // Seta apontando para baixo: cone invertido com uma "cabeça" redonda.
    const tip = new Mesh(shapes.tip, this.arrowMaterial);
    tip.rotation.x = Math.PI;
    tip.position.y = 0.45;
    const head = new Mesh(shapes.head, this.arrowMaterial);
    head.position.y = 1.05;
    this.arrow.add(tip, head);

    this.ring = new Mesh(shapes.ring, this.ringMaterial);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 2;
    this.setTarget(null);
  }

  /** Mostra o marcador acima de `anchor` e o anel em `door`; null esconde. */
  setTarget(target: MarkerTarget | null): void {
    this.arrow.visible = this.ring.visible = target !== null;
    if (!target) return;
    const color = new Color(target.color);
    this.arrowMaterial.color.copy(color);
    this.arrowMaterial.emissive.copy(color).multiplyScalar(0.25);
    this.ringMaterial.color.copy(color).lerp(new Color(0xffffff), 0.35);
    this.baseY = target.anchor.y;
    this.arrow.position.set(target.anchor.x, target.anchor.y, target.anchor.z);
    this.ring.position.set(target.door.x, target.door.y + 0.06, target.door.z);
  }

  update(time: number, dt: number): void {
    if (!this.arrow.visible) return;
    if (prefersReducedMotion()) {
      this.arrow.position.y = this.baseY;
      this.arrow.rotation.y = 0;
      return;
    }
    this.arrow.position.y = this.baseY + Math.abs(Math.sin(time * 2.6)) * 0.45;
    this.arrow.rotation.y += dt * 1.2;
  }
}

/** Os marcadores das missões em andamento: no máximo uma por jogador. */
export class MissionMarkers {
  readonly object = new Group();
  private readonly markers: readonly Marker[];
  private time = 0;

  constructor() {
    this.object.name = 'marcadores-missao';
    const shapes: MarkerShapes = {
      tip: new ConeGeometry(0.45, 0.9, 16),
      head: new SphereGeometry(0.42, 16, 10),
      ring: new RingGeometry(0.55, 0.8, 32),
    };
    this.markers = Array.from({ length: TEAM.maxPlayers }, () => new Marker(shapes));
    for (const marker of this.markers) this.object.add(marker.arrow, marker.ring);
  }

  /** Mostra um marcador para cada alvo e esconde os outros. */
  setTargets(targets: readonly MarkerTarget[]): void {
    this.markers.forEach((marker, index) => marker.setTarget(targets[index] ?? null));
  }

  update(dt: number): void {
    this.time += dt;
    for (const marker of this.markers) marker.update(this.time, dt);
  }
}
