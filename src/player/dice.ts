import {
  BoxGeometry,
  CanvasTexture,
  MathUtils,
  Mesh,
  MeshLambertMaterial,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { CAMERA, DICE } from '../config';
import { prefersReducedMotion } from './character';

// Ordem das faces no BoxGeometry: +x, −x, +y, −y, +z, −z.
// Faces opostas somam 7, como num dado de verdade.
const FACE_VALUES = [3, 4, 1, 6, 2, 5] as const;
const FACE_NORMALS: Readonly<Record<number, Vector3>> = {
  1: new Vector3(0, 1, 0),
  6: new Vector3(0, -1, 0),
  2: new Vector3(0, 0, 1),
  5: new Vector3(0, 0, -1),
  3: new Vector3(1, 0, 0),
  4: new Vector3(-1, 0, 0),
};

// Posição das pintas de cada face, numa grade 3×3 (0 = canto, 1 = meio, 2 = outro canto).
const PIPS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

/** Desenha uma face do dado (fundo claro e pintas escuras) num canvas. */
function faceTexture(value: number, size = 128): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d9d6cc';
    ctx.fillRect(0, 0, size, size);
    // Retângulo de cantos arredondados feito à mão (roundRect não existe em navegador antigo).
    const m = 4;
    const r = size * 0.16;
    const e = size - m;
    ctx.fillStyle = '#fbfaf5';
    ctx.beginPath();
    ctx.moveTo(m + r, m);
    ctx.arcTo(e, m, e, e, r);
    ctx.arcTo(e, e, m, e, r);
    ctx.arcTo(m, e, m, m, r);
    ctx.arcTo(m, m, e, m, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#26303a';
    for (const [gx, gy] of PIPS[value]) {
      ctx.beginPath();
      ctx.arc(size * (0.27 + gx * 0.23), size * (0.27 + gy * 0.23), size * 0.085, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Deslocamento do dado: para a direita do personagem na tela e um pouco para a frente. */
const SIDE_OFFSET = (() => {
  const yaw = MathUtils.degToRad(CAMERA.yawDeg);
  const right = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const toCamera = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  return right.multiplyScalar(DICE.offset).addScaledVector(toCamera, DICE.offset * 0.3);
})();

interface RollAnimation {
  time: number;
  duration: number;
  ground: Vector3;
  height: number;
  final: Quaternion;
  axis: Vector3;
  spin: number;
  done: () => void;
}

/**
 * Dado 3D que cai rolando ao lado do personagem e para com a face sorteada para cima.
 * Feito só com geometria e texturas desenhadas em código.
 */
export class Dice3D {
  readonly mesh: Mesh;
  private anim: RollAnimation | null = null;
  private vanish = 0;
  private readonly tmpQ = new Quaternion();

  constructor() {
    const materials = FACE_VALUES.map((v) => new MeshLambertMaterial({ map: faceTexture(v) }));
    this.mesh = new Mesh(new BoxGeometry(DICE.size, DICE.size, DICE.size), materials);
    this.mesh.name = 'dado';
    this.mesh.visible = false;
  }

  /** Sorteia um número de 1 a DICE.sides. */
  static draw(): number {
    return 1 + Math.floor(Math.random() * DICE.sides);
  }

  /** Joga o dado ao lado de `at` (posição do personagem) mostrando `value`. Resolve quando ele para. */
  roll(value: number, at: Vector3): Promise<void> {
    const calm = prefersReducedMotion();
    const ground = at.clone().add(SIDE_OFFSET);
    ground.y = at.y + DICE.size / 2;

    // Orientação final: face sorteada para cima, girada de 90 em 90 graus ao acaso.
    const up = new Quaternion().setFromUnitVectors(FACE_NORMALS[value], new Vector3(0, 1, 0));
    const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (Math.floor(Math.random() * 4) * Math.PI) / 2);
    const final = yaw.multiply(up);

    this.vanish = 0;
    this.mesh.scale.setScalar(1);
    this.mesh.visible = true;

    return new Promise((resolve) => {
      this.anim = {
        time: 0,
        duration: calm ? 0.2 : DICE.rollDuration,
        ground,
        height: calm ? 0.3 : 3,
        final,
        axis: new Vector3(Math.random() - 0.5, Math.random() * 0.4, Math.random() - 0.5).normalize(),
        spin: calm ? 0 : Math.PI * (3 + Math.random() * 2),
        done: resolve,
      };
      this.applyRoll(0);
    });
  }

  /** Some com o dado (encolhendo rápido). */
  dismiss(): void {
    if (this.mesh.visible && !this.anim) this.vanish = 1;
  }

  update(dt: number): void {
    if (this.anim) {
      const r = this.anim;
      r.time = Math.min(r.duration, r.time + dt);
      this.applyRoll(r.time / r.duration);
      if (r.time >= r.duration) {
        this.anim = null;
        r.done();
      }
    } else if (this.vanish > 0) {
      this.vanish = Math.max(0, this.vanish - dt * 5);
      this.mesh.scale.setScalar(this.vanish);
      if (this.vanish === 0) this.mesh.visible = false;
    }
  }

  private applyRoll(t: number): void {
    const r = this.anim;
    if (!r) return;
    // Queda acelerando até o chão e um quique pequeno no final.
    const fall = 0.65;
    let y: number;
    if (t < fall) {
      const u = t / fall;
      y = r.height * (1 - u * u);
    } else {
      const u = (t - fall) / (1 - fall);
      y = Math.sin(Math.PI * u) * 0.3 * (1 - u) * Math.min(1, r.height);
    }
    this.mesh.position.set(r.ground.x, r.ground.y + y, r.ground.z);

    // Gira em volta de um eixo sorteado; o giro some até chegar exatamente na orientação final.
    const ease = 1 - (1 - t) * (1 - t);
    this.tmpQ.setFromAxisAngle(r.axis, r.spin * (1 - ease));
    this.mesh.quaternion.copy(r.final).multiply(this.tmpQ);
  }
}
