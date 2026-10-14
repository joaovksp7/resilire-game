import {
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
import { prefersReducedMotion } from '../player/character';

/**
 * Marcador da missão atual: uma seta grande na cor da instituição, flutuando acima da placa,
 * e um anel no chão em frente à porta. Pula de leve (parado com prefers-reduced-motion).
 */
export class MissionMarker {
  readonly object = new Group();
  private readonly arrow = new Group();
  private readonly ring: Mesh;
  private readonly arrowMaterial = new MeshLambertMaterial({ color: 0xffffff, emissive: 0x000000 });
  private readonly ringMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  private time = 0;
  private baseY = 0;

  constructor() {
    this.object.name = 'marcador-missao';
    // Seta apontando para baixo: cone invertido com uma "cabeça" redonda.
    const tip = new Mesh(new ConeGeometry(0.45, 0.9, 16), this.arrowMaterial);
    tip.rotation.x = Math.PI;
    tip.position.y = 0.45;
    const head = new Mesh(new SphereGeometry(0.42, 16, 10), this.arrowMaterial);
    head.position.y = 1.05;
    this.arrow.add(tip, head);

    this.ring = new Mesh(new RingGeometry(0.55, 0.8, 32), this.ringMaterial);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 2;

    this.object.add(this.arrow, this.ring);
    this.object.visible = false;
  }

  /** Mostra o marcador acima de `anchor` e o anel em `door`; null esconde. */
  setTarget(target: { anchor: Vector3; door: Vector3; color: number } | null): void {
    if (!target) {
      this.object.visible = false;
      return;
    }
    const color = new Color(target.color);
    this.arrowMaterial.color.copy(color);
    this.arrowMaterial.emissive.copy(color).multiplyScalar(0.25);
    this.ringMaterial.color.copy(color).lerp(new Color(0xffffff), 0.35);
    this.baseY = target.anchor.y;
    this.arrow.position.set(target.anchor.x, target.anchor.y, target.anchor.z);
    this.ring.position.set(target.door.x, target.door.y + 0.06, target.door.z);
    this.object.visible = true;
  }

  update(dt: number): void {
    if (!this.object.visible) return;
    if (prefersReducedMotion()) {
      this.arrow.position.y = this.baseY;
      this.arrow.rotation.y = 0;
      return;
    }
    this.time += dt;
    this.arrow.position.y = this.baseY + Math.abs(Math.sin(this.time * 2.6)) * 0.45;
    this.arrow.rotation.y += dt * 1.2;
  }
}
