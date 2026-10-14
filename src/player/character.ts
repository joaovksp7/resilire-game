import {
  BoxGeometry,
  CircleGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
} from 'three';
import { PLAYER } from '../config';

const COLORS = {
  jacket: 0xffc23d,
  pants: 0x34508a,
  skin: 0xb07a4f,
  hair: 0x2e2019,
  shoes: 0x3a3a3a,
} as const;

const reducedMotionQuery =
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

/** true quando a pessoa pediu menos animação no sistema (prefers-reduced-motion). */
export function prefersReducedMotion(): boolean {
  return reducedMotionQuery?.matches ?? false;
}

/** Membro (perna ou braço) que gira a partir do topo: pivô no quadril/ombro. */
function limb(w: number, h: number, d: number, material: MeshLambertMaterial, x: number, pivotY: number): Group {
  const pivot = new Group();
  pivot.position.set(x, pivotY, 0);
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.y = -h / 2;
  pivot.add(mesh);
  return pivot;
}

/**
 * Personagem low-poly feito só com caixas e esferas, de frente para +z.
 * `root` fica no chão (y = 0 nos pés); quem move é o Player.
 */
export class Character {
  readonly root = new Group();
  private readonly body = new Group();
  private readonly legs: Group[];
  private readonly arms: Group[];
  private phase = 0;
  private swing = 0;

  constructor() {
    this.root.name = 'personagem';
    const mat = (color: number): MeshLambertMaterial => new MeshLambertMaterial({ color });
    const jacket = mat(COLORS.jacket);
    const pants = mat(COLORS.pants);
    const skin = mat(COLORS.skin);
    const hair = mat(COLORS.hair);

    this.legs = [limb(0.16, 0.48, 0.18, pants, -0.1, 0.5), limb(0.16, 0.48, 0.18, pants, 0.1, 0.5)];
    this.arms = [limb(0.12, 0.42, 0.14, jacket, -0.29, 0.92), limb(0.12, 0.42, 0.14, jacket, 0.29, 0.92)];

    const torso = new Mesh(new BoxGeometry(0.44, 0.46, 0.28), jacket);
    torso.position.y = 0.73;
    const head = new Mesh(new IcosahedronGeometry(0.19, 1), skin);
    head.position.y = 1.12;
    const hairCap = new Mesh(new SphereGeometry(0.205, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    hairCap.position.set(0, 1.14, -0.02);

    this.body.add(torso, head, hairCap, ...this.legs, ...this.arms);
    for (const leg of this.legs) {
      const shoe = new Mesh(new BoxGeometry(0.17, 0.08, 0.22), mat(COLORS.shoes));
      shoe.position.set(0, -0.46, 0.03);
      leg.add(shoe);
    }

    // Sombra redonda no chão: ajuda a ver onde o personagem pisa.
    const shadow = new Mesh(
      new CircleGeometry(0.38, 16),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;

    this.root.add(this.body, shadow);
    this.root.scale.setScalar(PLAYER.scale);
  }

  /**
   * Anima braços e pernas. `walking` liga o balanço; ao parar, volta suave para a posição de pé.
   * `hop` levanta o corpo (pulinho de casa em casa); a sombra continua no chão.
   */
  update(dt: number, walking: boolean, hop = 0): void {
    const target = walking ? 1 : 0;
    this.swing += (target - this.swing) * (1 - Math.exp(-10 * dt));
    if (walking) this.phase += dt * PLAYER.stepRate * Math.PI;

    const s = Math.sin(this.phase) * this.swing;
    this.legs[0].rotation.x = s * 0.6;
    this.legs[1].rotation.x = -s * 0.6;
    this.arms[0].rotation.x = -s * 0.5;
    this.arms[1].rotation.x = s * 0.5;
    // Balanço do corpo, desligado para quem pediu menos animação.
    const bob = prefersReducedMotion() ? 0 : Math.abs(Math.cos(this.phase)) * 0.04 * this.swing;
    this.body.position.y = bob + hop;
  }
}
