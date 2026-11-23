import {
  type Box3,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { PartBuilder, SIGN_ROTATION } from './buildings';
import type { Address, CityMap } from './cityMap';
import { covers } from './fade';
import type { GameContent } from '../missions/content';
import { STREETS } from './layout';

// O nome das ruas (content/ruas.json) escrito no chão e a placa de número, desenhados em canvas.

const LABEL_TEXT = '#ffffff';
const LABEL_OUTLINE = '#2a2f36';
const PLATE_BG = '#ffffff';
const PLATE_TEXT = '#1b2430';
const POLE = 0x7d8790;
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

/** "Rua das Araucárias, 241". Sem o nome da rua, só o número. */
export function addressText(streetNames: ReadonlyMap<string, string>, address: Address): string {
  const name = streetNames.get(address.street);
  return name ? `${name}, ${address.number}` : String(address.number);
}

/** Desenha um texto numa placa arredondada (a de número), diminuindo a letra até caber. */
function plateTexture(text: string, width: number, height: number, bg: string, fg: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const r = height * 0.18;
    const border = height * 0.07;
    const roundRect = (x: number, y: number, w: number, h: number, radius: number): void => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    };
    // Borda clara e fundo: contraste alto, dá para ler de longe.
    ctx.fillStyle = fg;
    roundRect(0, 0, width, height, r);
    ctx.fill();
    ctx.fillStyle = bg;
    roundRect(border, border, width - border * 2, height - border * 2, r - border / 2);
    ctx.fill();

    let size = Math.round(height * 0.52);
    const maxWidth = width - height * 0.5;
    ctx.font = `bold ${size}px ${FONT}`;
    while (size > 12 && ctx.measureText(text).width > maxWidth) {
      size -= 2;
      ctx.font = `bold ${size}px ${FONT}`;
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 + size * 0.04);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Placa de número (ex.: a casa em frente ao acidente): o número em preto sobre branco. */
export function createNumberPlate(number: number, x: number, groundY: number, z: number): Group {
  const group = new Group();
  group.name = `numero-${number}`;
  const w = 1.5;
  const h = 0.75;
  const poleH = 0.9;
  const pole = new PartBuilder().cylinder(0.05, 0.05, poleH + 0.2, x, groundY - 0.2, z, POLE).build();
  group.add(new Mesh(pole, new MeshLambertMaterial({ vertexColors: true })));
  const plate = new Mesh(
    new PlaneGeometry(w, h),
    new MeshBasicMaterial({ map: plateTexture(`Nº ${number}`, 256, 128, PLATE_BG, PLATE_TEXT), alphaTest: 0.5 }),
  );
  plate.position.set(x, groundY + poleH + h / 2, z);
  plate.rotation.copy(SIGN_ROTATION);
  group.add(plate);
  return group;
}

/** Altura das letras do nome no chão (a rua tem 1 tile de largura) e folga acima do asfalto. */
const LABEL_H = 1.1;
const LABEL_LIFT = 0.04;
/** De quanto em quanto o texto acompanha o relevo (unidades do mundo). */
const LABEL_STEP = 0.25;
/** Desenhado depois da água e do terreno, antes dos destaques do dado (1) e do anel da porta (2). */
const LABEL_RENDER_ORDER = 0.5;
/** Até quantos tiles o nome anda, para cada lado do ponto de `signs`, fugindo de prédio e casa. */
const LABEL_MAX_SHIFT = 4;
/** De quanto em quanto (tiles) testa as posições e folga mínima entre dois nomes (de qualquer rua). */
const LABEL_SHIFT_STEP = 0.5;
const LABEL_GAP = 0.5;
/** De quanto em quanto (unidades do mundo) confere se o nome está tapado, ao longo dele. */
const COVER_STEP = 0.5;
/** Até onde, na horizontal, um prédio alto ainda consegue tapar um ponto do chão. */
const COVER_REACH = 10;

/** Pontos do meio das letras de um nome no chão, centrado em (cx, cz). */
function labelSamplePoints(
  map: CityMap,
  cx: number,
  cz: number,
  along: { x: number; z: number },
  up: { x: number; z: number },
  length: number,
): Vector3[] {
  const points: Vector3[] = [];
  const steps = Math.max(1, Math.round(length / COVER_STEP));
  for (let i = 0; i <= steps; i++) {
    const s = -length / 2 + (length * i) / steps;
    for (const t of [-LABEL_H / 4, 0, LABEL_H / 4]) {
      const x = cx + along.x * s + up.x * t;
      const z = cz + along.z * s + up.z * t;
      points.push(new Vector3(x, map.walkHeightAt(x, z) + LABEL_LIFT, z));
    }
  }
  return points;
}

/** Quantos pontos algum obstáculo tapa. */
function coveredCount(points: readonly Vector3[], obstacles: readonly Box3[]): number {
  let count = 0;
  for (const p of points) if (obstacles.some((box) => covers(box, p))) count++;
  return count;
}

/** O nome da rua para pintar no chão: letra branca com contorno escuro, fundo transparente. */
function groundLabelTexture(text: string): { texture: CanvasTexture; aspect: number } {
  const height = 128;
  const size = 84;
  const stroke = 14;
  const font = `bold ${size}px ${FONT}`;
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (measure) measure.font = font;
  const width = Math.ceil((measure?.measureText(text).width ?? text.length * size * 0.55) + stroke * 2 + 16);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke;
    ctx.strokeStyle = LABEL_OUTLINE;
    ctx.strokeText(text, width / 2, height / 2 + size * 0.04);
    ctx.fillStyle = LABEL_TEXT;
    ctx.fillText(text, width / 2, height / 2 + size * 0.04);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // O chão é visto de lado: a filtragem anisotrópica deixa as letras nítidas (o three.js limita ao máximo da placa).
  texture.anisotropy = 8;
  return { texture, aspect: width / height };
}

/**
 * Faixa deitada no chão, de comprimento `length` ao longo de `along` e largura LABEL_H, que sobe e
 * desce com o terreno (e fica em cima do piso da ponte). `up` aponta para o alto das letras.
 */
function groundStrip(
  map: CityMap,
  cx: number,
  cz: number,
  along: { x: number; z: number },
  up: { x: number; z: number },
  length: number,
): BufferGeometry {
  const steps = Math.max(1, Math.ceil(length / LABEL_STEP));
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = -length / 2 + (length * i) / steps;
    for (const t of [-LABEL_H / 2, LABEL_H / 2]) {
      const x = cx + along.x * s + up.x * t;
      const z = cz + along.z * s + up.z * t;
      positions.push(x, map.walkHeightAt(x, z) + LABEL_LIFT, z);
      uvs.push(i / steps, t > 0 ? 1 : 0);
    }
    if (i > 0) {
      const a = (i - 1) * 2;
      // Dois triângulos por fatia, virados para cima.
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * O nome de cada rua escrito no asfalto, ao longo da rua (como num mapa), perto dos pontos de `signs` de
 * cada trecho (src/world/layout.ts). O nome anda até LABEL_MAX_SHIFT tiles para cada lado, para onde
 * os `obstacles` (prédios e casas) menos o tapam na tela. O texto se lê da esquerda para a direita na
 * tela: nas ruas leste–oeste corre para leste, nas norte–sul corre para o norte. Cada rua desenha a
 * textura uma vez só.
 */
export function createStreetNames(
  map: CityMap,
  streetNames: ReadonlyMap<string, string>,
  obstacles: readonly Box3[] = [],
): Group {
  const group = new Group();
  group.name = 'nomes-das-ruas';
  const labels = new Map<string, { material: MeshBasicMaterial; aspect: number }>();
  const ts = map.tileSize;
  /** Retângulo (no chão) de cada nome já escrito: um nome não pode encostar em outro. */
  const placed: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];

  for (const segment of STREETS) {
    const name = streetNames.get(segment.street);
    if (!name) continue;
    let label = labels.get(segment.street);
    if (!label) {
      const { texture, aspect } = groundLabelTexture(name);
      const material = new MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      label = { material, aspect };
      labels.set(segment.street, label);
    }
    const length = LABEL_H * label.aspect;
    const isRow = segment.row !== undefined;
    // Ruas de linha: para leste, com o alto das letras ao norte. De coluna: para o norte, alto a oeste.
    const along = isRow ? { x: 1, z: 0 } : { x: 0, z: -1 };
    const up = isRow ? { x: 0, z: -1 } : { x: -1, z: 0 };
    // O texto fica inteiro dentro do trecho, mesmo perto da ponta.
    const half = length / 2 / ts;
    const first = segment.from + half;
    const last = segment.to + 1 - half;

    const line = isRow ? (segment.row as number) : (segment.col as number);
    const toWorld = (center: number): { cx: number; cz: number } => ({
      cx: map.colToX(isRow ? center : line + 0.5),
      cz: map.rowToZ(isRow ? line + 0.5 : center),
    });
    // Só os obstáculos perto das posições testadas entram na conta.
    const near = (center: number): Box3[] => {
      const { cx, cz } = toWorld(center);
      const reach = length / 2 + LABEL_MAX_SHIFT * ts + COVER_REACH;
      return obstacles.filter(
        (box) => box.max.x > cx - reach && box.min.x < cx + reach && box.max.z > cz - reach && box.min.z < cz + reach,
      );
    };
    const rectAt = (center: number): { minX: number; maxX: number; minZ: number; maxZ: number } => {
      const { cx, cz } = toWorld(center);
      const [hx, hz] = isRow ? [length / 2, LABEL_H / 2] : [LABEL_H / 2, length / 2];
      return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz };
    };
    const gap = LABEL_GAP * ts;
    const touchesOther = (center: number): boolean => {
      const r = rectAt(center);
      return placed.some(
        (o) => r.minX < o.maxX + gap && r.maxX > o.minX - gap && r.minZ < o.maxZ + gap && r.maxZ > o.minZ - gap,
      );
    };

    for (const at of segment.signs) {
      const preferred = first <= last ? Math.min(Math.max(at + 0.5, first), last) : (segment.from + segment.to + 1) / 2;
      let center = preferred;
      if (first <= last && obstacles.length > 0) {
        const nearby = near(preferred);
        let bestScore = Infinity;
        for (let shift = -LABEL_MAX_SHIFT; shift <= LABEL_MAX_SHIFT; shift += LABEL_SHIFT_STEP) {
          const c = Math.min(Math.max(preferred + shift, first), last);
          // Um nome não encosta em outro (nem da mesma rua, nem no cruzamento com outra).
          if (touchesOther(c)) continue;
          const { cx, cz } = toWorld(c);
          const score = coveredCount(labelSamplePoints(map, cx, cz, along, up, length), nearby);
          // Empate: fica o mais perto do ponto escolhido em `signs`.
          if (score < bestScore || (score === bestScore && Math.abs(c - preferred) < Math.abs(center - preferred))) {
            bestScore = score;
            center = c;
          }
        }
      }
      placed.push(rectAt(center));
      const { cx, cz } = toWorld(center);
      const mesh = new Mesh(groundStrip(map, cx, cz, along, up, length), label.material);
      mesh.name = `nome-${segment.street}`;
      mesh.renderOrder = LABEL_RENDER_ORDER;
      group.add(mesh);
    }
  }
  return group;
}

/**
 * Numa missão com `local` e atividade `chamada`, a resposta certa de algum momento precisa trazer o
 * endereço que está escrito no lugar (nome no chão da rua e placa de número) (ex.: "Rua das Araucárias, 241"). Se o nome da rua mudar em
 * content/ruas.json, ou o lugar mudar no mapa, o texto da atividade precisa mudar junto.
 * Devolve a mensagem para a equipe de conteúdo, ou null.
 */
export function missionAddressProblem(map: CityMap, content: GameContent): string | null {
  for (const mission of content.missions) {
    if (!mission.local || mission.atividade === undefined) continue;
    const activity = content.activities.get(mission.atividade);
    if (activity?.tipo !== 'chamada') continue;
    const site = map.places.get(mission.local.id);
    const address = site && map.addressOf(site);
    if (!address) return `src/world/layout.ts: o lugar "${mission.local.id}" não tem porta numa rua com nome.`;
    const text = addressText(content.streets, address);
    const said = activity.momentos.some((m) => m.alternativas[m.correta].texto.includes(text));
    if (!said) {
      return (
        `content/atividades.json: atividade "${activity.id}": a resposta certa de algum momento precisa dizer o ` +
        `endereço do lugar, "${text}", como está escrito na cidade (nome da rua no chão e placa de número).`
      );
    }
  }
  return null;
}
