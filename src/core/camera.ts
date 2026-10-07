import { MathUtils, OrthographicCamera, Vector3 } from 'three';
import { CAMERA } from '../config';

/** Algo que a câmera pode seguir (ex.: o personagem, na Fase 3). */
export interface FollowTarget {
  readonly position: Vector3;
}

/**
 * Câmera isométrica (ortográfica) que olha para um ponto no chão.
 * - pan(): movimento livre (WASD/setas), relativo à tela
 * - zoomBy(): zoom com limites (roda do mouse / pinça)
 * - follow(): passa a seguir um alvo; qualquer pan manual para de seguir
 */
export class IsoCamera {
  readonly camera: OrthographicCamera;
  /** Ponto do chão no centro da tela. */
  readonly focus = new Vector3();

  private readonly offset = new Vector3();
  private readonly screenRight = new Vector3();
  private readonly screenUp = new Vector3();
  private readonly bounds: number;
  private followTarget: FollowTarget | null = null;

  constructor(bounds: number) {
    this.bounds = bounds;
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, CAMERA.distance * 3);
    this.camera.zoom = CAMERA.initialZoom;

    const yaw = MathUtils.degToRad(CAMERA.yawDeg);
    const pitch = MathUtils.degToRad(CAMERA.pitchDeg);
    this.offset
      .set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
      .multiplyScalar(CAMERA.distance);

    // Direções da tela projetadas no chão (para o pan andar "para cima" na tela).
    this.screenRight.set(Math.cos(yaw), 0, -Math.sin(yaw));
    this.screenUp.set(-Math.sin(yaw), 0, -Math.cos(yaw));

    this.applyTransform();
  }

  get zoom(): number {
    return this.camera.zoom;
  }

  resize(width: number, height: number): void {
    const aspect = width / height;
    const half = CAMERA.viewSize / 2;
    const halfW = aspect >= 1 ? half * aspect : half;
    const halfH = aspect >= 1 ? half : half / aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }

  /** Move o foco em coordenadas de tela (x = direita, y = cima), em unidades por segundo. */
  pan(x: number, y: number, dt: number): void {
    if (x === 0 && y === 0) return;
    this.followTarget = null;
    const speed = (CAMERA.panSpeed / this.camera.zoom) * dt;
    this.focus.addScaledVector(this.screenRight, x * speed);
    this.focus.addScaledVector(this.screenUp, y * speed);
    this.clampFocus();
  }

  /** Multiplica o zoom atual (factor > 1 aproxima), respeitando os limites. */
  zoomBy(factor: number): void {
    if (factor === 1) return;
    const next = MathUtils.clamp(this.camera.zoom * factor, CAMERA.minZoom, CAMERA.maxZoom);
    if (next === this.camera.zoom) return;
    this.camera.zoom = next;
    this.camera.updateProjectionMatrix();
  }

  follow(target: FollowTarget | null): void {
    this.followTarget = target;
  }

  get isFollowing(): boolean {
    return this.followTarget !== null;
  }

  update(dt: number): void {
    if (this.followTarget) {
      const t = 1 - Math.exp(-CAMERA.followSharpness * dt);
      this.focus.x += (this.followTarget.position.x - this.focus.x) * t;
      this.focus.z += (this.followTarget.position.z - this.focus.z) * t;
      this.clampFocus();
    }
    this.applyTransform();
  }

  private clampFocus(): void {
    this.focus.x = MathUtils.clamp(this.focus.x, -this.bounds, this.bounds);
    this.focus.z = MathUtils.clamp(this.focus.z, -this.bounds, this.bounds);
    this.focus.y = 0;
  }

  private applyTransform(): void {
    this.camera.position.copy(this.focus).add(this.offset);
    this.camera.lookAt(this.focus);
  }
}
