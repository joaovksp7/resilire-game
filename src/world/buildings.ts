import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CAMERA } from '../config';
import type { CityMap, InstitutionSite, Side } from './cityMap';
import { createIconTexture } from './icons';
import { type InstitutionId, INSTITUTION_STYLES, type InstitutionStyle } from './institutions';

/**
 * Junta várias peças simples (caixas, cilindros…) numa geometria só, com cor por vértice.
 * Um prédio inteiro vira um único desenho na placa de vídeo.
 */
export class PartBuilder {
  private readonly parts: BufferGeometry[] = [];
  private readonly matrix = new Matrix4();
  private readonly quat = new Quaternion();
  private readonly euler = new Euler();
  private readonly pos = new Vector3();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly color = new Color();

  add(geometry: BufferGeometry, color: number, x: number, y: number, z: number, rotX = 0, rotY = 0, rotZ = 0): this {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    g.deleteAttribute('uv');
    this.quat.setFromEuler(this.euler.set(rotX, rotY, rotZ));
    g.applyMatrix4(this.matrix.compose(this.pos.set(x, y, z), this.quat, this.scale));

    this.color.setHex(color);
    const count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = this.color.r;
      colors[i * 3 + 1] = this.color.g;
      colors[i * 3 + 2] = this.color.b;
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    this.parts.push(g);
    return this;
  }

  /** Caixa com a base em y (mais fácil de empilhar). */
  box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, rotY = 0): this {
    return this.add(new BoxGeometry(w, h, d), color, x, y + h / 2, z, 0, rotY);
  }

  /** Cilindro em pé com a base em y. */
  cylinder(rTop: number, rBottom: number, h: number, x: number, y: number, z: number, color: number, segments = 6): this {
    return this.add(new CylinderGeometry(rTop, rBottom, h, segments), color, x, y + h / 2, z);
  }

  build(): BufferGeometry {
    const merged = mergeGeometries(this.parts);
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    if (!merged) throw new Error('Não foi possível montar a geometria do prédio.');
    return merged;
  }
}

function shade(color: number, factor: number): number {
  return new Color(color).multiplyScalar(factor).getHex();
}

function tint(color: number, amount: number): number {
  return new Color(color).lerp(new Color(0xffffff), amount).getHex();
}

const FLOOR_HEIGHT = 1.1;
const SINK = 0.6; // quanto o prédio entra no chão (esconde frestas em terreno irregular)
const WINDOW = 0xd8eef8;
const DOOR = 0x5a4636;
const WHITE = 0xf4f3ee;
const POLE = 0x7d8790;

const SIDE_ROTATION: Record<Side, number> = {
  south: 0,
  east: Math.PI / 2,
  north: Math.PI,
  west: -Math.PI / 2,
};

/** Janelas espalhadas numa fachada. `axis` diz se a fachada corre ao longo de x ou de z. */
function addWindows(
  b: PartBuilder,
  length: number,
  floors: number,
  faceOffset: number,
  axis: 'x' | 'z',
  skipCenter: number | null,
  firstFloor = 0,
): void {
  const count = Math.max(1, Math.floor((length - 0.6) / 1.0));
  const step = length / count;
  for (let f = firstFloor; f < floors; f++) {
    for (let i = 0; i < count; i++) {
      const along = -length / 2 + step * (i + 0.5);
      if (f === 0 && skipCenter !== null && Math.abs(along - skipCenter) < 0.8) continue;
      const y = f * FLOOR_HEIGHT + 0.45;
      if (axis === 'x') b.box(0.45, 0.45, 0.06, along, y, faceOffset, WINDOW);
      else b.box(0.06, 0.45, 0.45, faceOffset, y, along, WINDOW);
    }
  }
}

/** Corpo + janelas nas quatro faces (qualquer face pode ficar virada para a câmera). */
function addBody(b: PartBuilder, w: number, d: number, h: number, floors: number, color: number, doorX: number | null): void {
  b.box(w, h + SINK, d, 0, -SINK, 0, color);
  addWindows(b, w, floors, d / 2 + 0.02, 'x', doorX);
  addWindows(b, w, floors, -d / 2 - 0.02, 'x', null);
  addWindows(b, d, floors, w / 2 + 0.02, 'z', null);
  addWindows(b, d, floors, -w / 2 - 0.02, 'z', null);
}

/** Telhado de duas águas: um prisma deitado ao longo de x. */
function addGableRoof(b: PartBuilder, w: number, d: number, y: number, color: number, pitch = 0.55): void {
  const s = (d + 0.3) / Math.SQRT2;
  const roof = new BoxGeometry(w + 0.3, s, s);
  roof.rotateX(Math.PI / 4);
  roof.scale(1, pitch, 1);
  b.add(roof, color, 0, y, 0);
}

/**
 * `far` = sinais (±1, ±1) do canto do prédio mais longe da câmera, em coordenadas locais.
 * Antena, torre, caixa d'água e chaminé vão para esse lado, para não taparem a fachada nem a placa.
 */
function buildModel(
  style: InstitutionStyle,
  w: number,
  d: number,
  doorX: number,
  far: { x: number; z: number },
): { geometry: BufferGeometry; top: number } {
  const b = new PartBuilder();
  const c = style.color;
  const h = style.floors * FLOOR_HEIGHT + 0.3;
  const front = d / 2 + 0.02;
  let top = h;

  switch (style.shape) {
    case 'office': {
      addBody(b, w, d, h, style.floors, c, doorX);
      b.box(w + 0.2, 0.2, d + 0.2, 0, h, 0, shade(c, 0.6));
      b.box(1.8, 0.12, 0.9, doorX, 1.15, front + 0.43, WHITE);
      b.box(0.8, 0.5, 0.8, (far.x * w) / 4, h + 0.2, (far.z * d) / 4, 0xc9ced3);
      b.box(0.75, 0.95, 0.06, doorX, 0, front, DOOR);
      top = h + 0.7;
      break;
    }
    case 'firehouse': {
      b.box(w, h + SINK, d, 0, -SINK, 0, c);
      addWindows(b, w, style.floors, front, 'x', null, 1);
      addWindows(b, w, style.floors, -front, 'x', null);
      addWindows(b, d, style.floors, w / 2 + 0.02, 'z', null);
      addWindows(b, d, style.floors, -w / 2 - 0.02, 'z', null);
      b.box(w + 0.2, 0.2, d + 0.2, 0, h, 0, WHITE);
      const gx = MathUtils.clamp(doorX, -w / 2 + 1.3, w / 2 - 1.3);
      b.box(1.0, 1.25, 0.06, gx - 0.6, 0, front, WHITE);
      b.box(1.0, 1.25, 0.06, gx + 0.6, 0, front, WHITE);
      // Torre nos fundos, do lado mais longe da câmera.
      const tx = far.x * (w / 2 - 0.45);
      const tz = -d / 2 + 0.45;
      b.box(0.9, h + 1.6 + SINK, 0.9, tx, -SINK, tz, c);
      b.box(1.1, 0.2, 1.1, tx, h + 1.6, tz, WHITE);
      top = h + 1.8;
      break;
    }
    case 'school': {
      addBody(b, w, d, h, style.floors, c, doorX);
      addGableRoof(b, w, d, h, shade(c, 0.62));
      b.box(0.75, 0.95, 0.06, doorX, 0, front, DOOR);
      top = h + (d + 0.3) * 0.28;
      break;
    }
    case 'clinic': {
      addBody(b, w, d, h, style.floors, WHITE, doorX);
      b.box(w + 0.04, 0.32, d + 0.04, 0, h - 0.42, 0, c);
      b.box(w + 0.2, 0.2, d + 0.2, 0, h, 0, c);
      b.box(1.0, 1.0, 0.06, doorX, 0, front, 0x9fd3cf);
      top = h + 0.2;
      break;
    }
    case 'gym': {
      b.box(w, h + SINK, d, 0, -SINK, 0, c);
      addWindows(b, w, 2, -front, 'x', null, 1);
      addWindows(b, w, 2, front, 'x', null, 1);
      const r = d / 2 + 0.15;
      const vault = new CylinderGeometry(r, r, w + 0.2, 14, 1, false, 0, Math.PI);
      vault.rotateZ(Math.PI / 2);
      vault.scale(1, 0.55, 1);
      b.add(vault, tint(c, 0.45), 0, h, 0);
      b.box(1.8, 1.4, 0.06, doorX, 0, front, WHITE);
      top = h + r * 0.55;
      break;
    }
    case 'radio': {
      addBody(b, w, d, h, style.floors, c, doorX);
      b.box(w + 0.2, 0.2, d + 0.2, 0, h, 0, shade(c, 0.6));
      b.box(0.75, 0.95, 0.06, doorX, 0, front, DOOR);
      const ax = far.x * (w / 2 - 0.6);
      const az = far.z * (d / 2 - 0.6);
      b.cylinder(0.06, 0.12, 4.2, ax, h, az, WHITE);
      for (const y of [1.2, 2.3, 3.4]) b.cylinder(0.26, 0.26, 0.1, ax, h + y, az, c, 8);
      b.add(new SphereGeometry(0.2, 8, 6), c, ax, h + 4.3, az);
      top = h + 0.2;
      break;
    }
    case 'market': {
      addBody(b, w, d, h, style.floors, c, doorX);
      b.box(w + 0.2, 0.2, d + 0.2, 0, h, 0, WHITE);
      const awning = new BoxGeometry(w * 0.9, 0.08, 1.0);
      b.add(awning, WHITE, 0, 1.35, front + 0.42, 0.35);
      b.box(w * 0.9, 0.22, 0.05, 0, 1.0, front + 0.9, c);
      b.box(1.0, 1.0, 0.06, doorX, 0, front, 0xbfe3f0);
      top = h + 0.2;
      break;
    }
    case 'house': {
      addBody(b, w, d, h, style.floors, 0xfff4e0, doorX);
      addGableRoof(b, w, d, h, c, 0.7);
      b.box(0.3, 0.9, 0.3, (far.x * w) / 4, h, (far.z * d) / 4, shade(c, 0.55));
      b.box(0.55, 0.85, 0.06, doorX, 0, front, shade(c, 0.6));
      top = h + (d + 0.3) * 0.35;
      break;
    }
  }

  return { geometry: b.build(), top };
}

const SIGN_ROTATION = new Euler(-MathUtils.degToRad(CAMERA.pitchDeg), MathUtils.degToRad(CAMERA.yawDeg), 0, 'YXZ');

function createSite(map: CityMap, site: InstitutionSite, material: MeshLambertMaterial): Group {
  const style = INSTITUTION_STYLES[site.id];
  const ts = map.tileSize;
  const cols = site.maxCol - site.minCol + 1;
  const rows = site.maxRow - site.minRow + 1;
  const margin = cols * rows === 1 ? 0.4 : 0.6;
  const alongX = site.doorSide === 'south' || site.doorSide === 'north';
  const w = (alongX ? cols : rows) * ts - margin;
  const d = (alongX ? rows : cols) * ts - margin;

  const cx = map.colToX((site.minCol + site.maxCol + 1) / 2);
  const cz = map.rowToZ((site.minRow + site.maxRow + 1) / 2);
  const baseY = map.heightAt(cx, cz);
  const rotY = SIDE_ROTATION[site.doorSide];

  // Posição da porta ao longo da fachada, alinhada com o tile "*".
  const door = map.tileCenter(site.door.col, site.door.row);
  const localX = new Vector3(Math.cos(rotY), 0, -Math.sin(rotY));
  const localZ = new Vector3(Math.sin(rotY), 0, Math.cos(rotY));
  const doorX = MathUtils.clamp((door.x - cx) * localX.x + (door.z - cz) * localX.z, -w / 2 + 0.6, w / 2 - 0.6);

  // A câmera olha de sudeste, então o canto mais longe é o noroeste (−x, −z no mundo).
  const far = {
    x: Math.sign(-localX.x - localX.z) || -1,
    z: Math.sign(-localZ.x - localZ.z) || -1,
  };

  const { geometry, top } = buildModel(style, w, d, doorX, far);
  const building = new Mesh(geometry, material);
  building.position.set(cx, baseY, cz);
  building.rotation.y = rotY;

  const group = new Group();
  group.name = `instituicao-${site.id}`;
  // Usado pelo clique: tocar no prédio ou na placa leva o personagem até a porta.
  group.userData.institution = site.id;
  group.add(building);

  // Placa com o ícone, sempre virada para a câmera.
  const signSize = cols * rows === 1 ? 1.2 : 1.5;
  const signY = baseY + top + 0.5 + signSize / 2;
  const pole = new PartBuilder().cylinder(0.06, 0.06, signY - (baseY + top) - 0.2, cx, baseY + top - 0.1, cz, POLE).build();
  group.add(new Mesh(pole, material));

  const sign = new Mesh(
    new PlaneGeometry(signSize, signSize),
    new MeshBasicMaterial({ map: createIconTexture(style.icon, style.color), alphaTest: 0.5 }),
  );
  sign.position.set(cx, signY, cz);
  sign.rotation.copy(SIGN_ROTATION);
  group.add(sign);

  // Ponto logo acima da placa: onde fica o marcador da missão (Fase 4).
  group.userData.markerAnchor = new Vector3(cx, signY + signSize / 2 + 0.3, cz);
  return group;
}

export interface InstitutionBuildings {
  readonly group: Group;
  /** Ponto acima da placa de cada instituição, para o marcador da missão. */
  readonly markerAnchors: ReadonlyMap<InstitutionId, Vector3>;
}

/** Prédios das instituições (e da casa do jogador), com placa de ícone no topo. */
export function createInstitutionBuildings(map: CityMap): InstitutionBuildings {
  const group = new Group();
  group.name = 'instituicoes';
  const material = new MeshLambertMaterial({ vertexColors: true });
  const markerAnchors = new Map<InstitutionId, Vector3>();
  for (const site of map.sites.values()) {
    const siteGroup = createSite(map, site, material);
    markerAnchors.set(site.id, siteGroup.userData.markerAnchor as Vector3);
    group.add(siteGroup);
  }
  return { group, markerAnchors };
}
