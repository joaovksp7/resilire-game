import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  type OrthographicCamera,
  type Vector3,
} from 'three';
import { CAMERA, RAIN } from '../config';
import { prefersReducedMotion } from '../player/character';

const coarsePointerQuery =
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;

/** Camada onde as gotas caem, em relação ao ponto que a câmera olha (unidades com zoom 1). */
const LAYER_BOTTOM = -2;
const LAYER_HEIGHT = 8;

/**
 * Chuva: riscos finos numa malha só (um desenho na placa de vídeo), que acompanha a câmera.
 * As gotas ficam numa caixa em volta do ponto que a câmera olha, virada para a câmera e
 * na escala do zoom: a chuva fica igual na tela com qualquer zoom. Gotas abaixo do chão
 * ficam escondidas pelo próprio terreno.
 */
export class Rain {
  readonly mesh: Mesh;
  private readonly capacity: number;
  private readonly positions: Float32Array;
  private readonly attribute: BufferAttribute;
  // Cada gota: posição na caixa de 0 a 1 (lado, profundidade, altura) e um fator de velocidade.
  private readonly side: Float32Array;
  private readonly depth: Float32Array;
  private readonly height: Float32Array;
  private readonly pace: Float32Array;
  private readonly cosPitch: number;
  private readonly sinPitch: number;
  private amount = 0;

  constructor() {
    // Menos gotas em tela de toque (celular e tablet).
    this.capacity = coarsePointerQuery?.matches ? RAIN.maxDropsMobile : RAIN.maxDrops;
    const n = this.capacity;
    this.side = new Float32Array(n);
    this.depth = new Float32Array(n);
    this.height = new Float32Array(n);
    this.pace = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.side[i] = Math.random();
      this.depth[i] = Math.random();
      this.height[i] = Math.random();
      this.pace[i] = 0.85 + Math.random() * 0.3;
    }

    // 4 vértices e 2 triângulos por gota; os índices não mudam.
    this.positions = new Float32Array(n * 4 * 3);
    const index = new Uint16Array(n * 6);
    for (let i = 0; i < n; i++) {
      const v = i * 4;
      index.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6);
    }
    this.attribute = new BufferAttribute(this.positions, 3);
    this.attribute.setUsage(DynamicDrawUsage);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.attribute);
    geometry.setIndex(new BufferAttribute(index, 1));
    geometry.setDrawRange(0, 0);

    this.mesh = new Mesh(
      geometry,
      new MeshBasicMaterial({ color: RAIN.color, transparent: true, opacity: RAIN.opacity, depthWrite: false }),
    );
    this.mesh.name = 'chuva';
    // As posições mudam a cada quadro: não dá para recortar pela caixa da geometria.
    this.mesh.frustumCulled = false;
    // Depois da água e dos destaques no chão.
    this.mesh.renderOrder = 3;
    this.mesh.visible = false;
    // Girada como a câmera: x local = direita da tela, z local = em direção à câmera.
    this.mesh.rotation.y = MathUtils.degToRad(CAMERA.yawDeg);
    const pitch = MathUtils.degToRad(CAMERA.pitchDeg);
    this.cosPitch = Math.cos(pitch);
    this.sinPitch = Math.sin(pitch);
  }

  /** Quantidade de chuva, de 0 (nada) a 1 (chuva forte). */
  setAmount(amount: number): void {
    this.amount = MathUtils.clamp(amount, 0, 1);
  }

  /** Quantidade de chuva agora (muda aos poucos na troca de eixo). O som da chuva segue este valor. */
  get intensity(): number {
    return this.amount;
  }

  update(dt: number, focus: Vector3, camera: OrthographicCamera): void {
    const reduced = prefersReducedMotion();
    const factor = reduced ? RAIN.reducedMotionFactor : 1;
    const count = Math.round(this.capacity * this.amount * factor);
    this.mesh.visible = count > 0;
    if (count === 0) return;

    // Tamanho da caixa (unidades com zoom 1): a largura da tela, e a profundidade que faz a
    // camada de chuva cobrir a tela de cima a baixo (o chão mais perto da câmera aparece mais embaixo).
    const slant = reduced ? 0 : RAIN.slant * this.amount;
    const halfSide = camera.right + slant * LAYER_HEIGHT + 1;
    const layerTop = (LAYER_BOTTOM + LAYER_HEIGHT) * this.cosPitch;
    const halfDepth = (camera.top + layerTop) / this.sinPitch + 0.5;

    const speed = MathUtils.lerp(RAIN.speedMin, RAIN.speedMax, this.amount) * factor;
    const fall = (speed * dt) / LAYER_HEIGHT;
    const hw = RAIN.width / 2;
    const len = RAIN.length;
    const lean = slant * len;
    const p = this.positions;

    for (let i = 0; i < count; i++) {
      let h = this.height[i] - fall * this.pace[i];
      if (h < 0) {
        // Chegou embaixo: volta para cima em outro lugar.
        h += 1;
        if (h < 0) h = Math.random();
        this.side[i] = Math.random();
        this.depth[i] = Math.random();
      }
      this.height[i] = h;

      const y = LAYER_BOTTOM + h * LAYER_HEIGHT;
      const x = (this.side[i] * 2 - 1) * halfSide + slant * (y - LAYER_BOTTOM);
      const z = (this.depth[i] * 2 - 1) * halfDepth;
      const o = i * 12;
      p[o] = x - hw;
      p[o + 1] = y;
      p[o + 2] = z;
      p[o + 3] = x + hw;
      p[o + 4] = y;
      p[o + 5] = z;
      p[o + 6] = x + hw + lean;
      p[o + 7] = y + len;
      p[o + 8] = z;
      p[o + 9] = x - hw + lean;
      p[o + 10] = y + len;
      p[o + 11] = z;
    }

    // Manda para a placa de vídeo só a parte usada.
    this.attribute.clearUpdateRanges();
    this.attribute.addUpdateRange(0, count * 12);
    this.attribute.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, count * 6);
    this.mesh.position.copy(focus);
    this.mesh.scale.setScalar(1 / camera.zoom);
  }
}
