import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  type BufferGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { PartBuilder } from './buildings';
import { type CityMap, tileNoise } from './cityMap';

const HOUSE_WALLS = [0xf5e6c8, 0xe8d5b7, 0xf2c6a0, 0xdce8f0, 0xf7f3e8, 0xe9c9c9, 0xcfe3c6];
const HOUSE_ROOFS = [0xb5533c, 0x8d4e3a, 0xc9763c, 0x7a6a5a, 0xa4473a];
const BUILDING_WALLS = [0xd9d4cc, 0xc9ced6, 0xe3d9c6, 0xbfc8c2];
const BUILDING_TOP = 0x8e959b;
const TREE_CROWNS = [0x5e9e3c, 0x6daa45, 0x4f8f3a, 0x7cb653];
const TREE_TRUNK = 0x7a5236;

interface Placement {
  position: Vector3;
  scale: Vector3;
  rotationY: number;
  color: number;
}

/** Cria um InstancedMesh a partir de uma lista de posições (um desenho só para todas). */
function instanced(geometry: BufferGeometry, items: Placement[], name: string): InstancedMesh {
  const mesh = new InstancedMesh(geometry, new MeshLambertMaterial(), Math.max(1, items.length));
  mesh.name = name;
  mesh.count = items.length;
  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const c = new Color();
  items.forEach((it, i) => {
    q.setFromAxisAngle(up, it.rotationY);
    mesh.setMatrixAt(i, m.compose(it.position, q, it.scale));
    mesh.setColorAt(i, c.setHex(it.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function pick<T>(list: readonly T[], r: number): T {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}

/** Menor e maior altura do terreno sob um quadrado centrado em (x, z). */
function groundRange(map: CityMap, x: number, z: number, half: number): [number, number] {
  const hs = [
    map.heightAt(x, z),
    map.heightAt(x - half, z - half),
    map.heightAt(x + half, z - half),
    map.heightAt(x - half, z + half),
    map.heightAt(x + half, z + half),
  ];
  return [Math.min(...hs), Math.max(...hs)];
}

/** Casas, prédios comuns, árvores e ponte. */
export function createDecor(map: CityMap): Group {
  const group = new Group();
  group.name = 'decoracao';

  const houseBodies: Placement[] = [];
  const houseRoofs: Placement[] = [];
  const blocks: Placement[] = [];
  const blockTops: Placement[] = [];
  const trunks: Placement[] = [];
  const crowns: Placement[] = [];

  const addTree = (x: number, z: number, n: number): void => {
    const trunkH = 0.45 + n * 0.35;
    const crownR = 0.55 + n * 0.35;
    const y = map.heightAt(x, z);
    trunks.push({ position: new Vector3(x, y - 0.2, z), scale: new Vector3(1, trunkH + 0.2, 1), rotationY: 0, color: TREE_TRUNK });
    crowns.push({
      position: new Vector3(x, y + trunkH + crownR * 0.6, z),
      scale: new Vector3(crownR, crownR * 1.1, crownR),
      rotationY: n * Math.PI * 2,
      color: pick(TREE_CROWNS, tileNoise(Math.round(x * 10), Math.round(z * 10), 7)),
    });
  };

  const center = new Vector3();
  for (const tile of map.tiles) {
    const { col, row } = tile;
    const r1 = tileNoise(col, row, 2);
    const r2 = tileNoise(col, row, 3);
    const r3 = tileNoise(col, row, 4);
    map.tileCenter(col, row, center);
    const jx = (r1 - 0.5) * 0.4;
    const jz = (r2 - 0.5) * 0.4;

    if (tile.kind === 'house') {
      const w = 1.1 + r1 * 0.35;
      const d = 1.1 + r2 * 0.35;
      const x = center.x + jx;
      const z = center.z + jz;
      const [low, high] = groundRange(map, x, z, Math.max(w, d) / 2);
      const bottom = low - 0.3;
      const top = high + 0.85 + r3 * 0.4;
      // No morro as casas ficam levemente tortas, como em ocupação de encosta.
      const yaw = tile.level >= 4 ? (r3 - 0.5) * 0.6 : 0;
      houseBodies.push({ position: new Vector3(x, bottom, z), scale: new Vector3(w, top - bottom, d), rotationY: yaw, color: pick(HOUSE_WALLS, r3) });
      houseRoofs.push({ position: new Vector3(x, top, z), scale: new Vector3(w + 0.2, 0.55 + r1 * 0.25, d + 0.2), rotationY: yaw, color: pick(HOUSE_ROOFS, r2) });
    } else if (tile.kind === 'building') {
      const w = 1.4 + r1 * 0.2;
      const x = center.x + jx * 0.5;
      const z = center.z + jz * 0.5;
      const [low, high] = groundRange(map, x, z, w / 2);
      const bottom = low - 0.3;
      const top = high + 2.4 + r3 * 1.8;
      blocks.push({ position: new Vector3(x, bottom, z), scale: new Vector3(w, top - bottom, w), rotationY: 0, color: pick(BUILDING_WALLS, r2) });
      blockTops.push({ position: new Vector3(x, top, z), scale: new Vector3(w + 0.15, 0.18, w + 0.15), rotationY: 0, color: BUILDING_TOP });
    } else if (tile.kind === 'tree') {
      addTree(center.x + jx, center.z + jz, r3);
      if (r1 < 0.35) addTree(center.x - jx * 1.6 + 0.3, center.z - jz * 1.6 - 0.3, r2);
    }
  }

  addPlazaTrees(map, addTree);

  // Geometrias com a base em y = 0, para a escala em y virar a altura.
  const box = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const roof = new ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  const trunk = new CylinderGeometry(0.1, 0.14, 1, 5).translate(0, 0.5, 0);
  const crown = new IcosahedronGeometry(1, 0);

  group.add(
    instanced(box, houseBodies, 'casas'),
    instanced(roof, houseRoofs, 'telhados'),
    instanced(box, blocks, 'predios'),
    instanced(box, blockTops, 'predios-topo'),
    instanced(trunk, trunks, 'troncos'),
    instanced(crown, crowns, 'copas'),
  );

  for (const bridge of createBridges(map)) group.add(bridge);
  return group;
}

/** Árvores nos quatro cantos de fora da praça. */
function addPlazaTrees(map: CityMap, addTree: (x: number, z: number, n: number) => void): void {
  const plaza = map.tiles.filter((t) => t.kind === 'plaza');
  if (plaza.length === 0) return;
  const minCol = Math.min(...plaza.map((t) => t.col));
  const maxCol = Math.max(...plaza.map((t) => t.col));
  const minRow = Math.min(...plaza.map((t) => t.row));
  const maxRow = Math.max(...plaza.map((t) => t.row));
  const inset = 0.45;
  const x0 = map.colToX(minCol) + inset;
  const x1 = map.colToX(maxCol + 1) - inset;
  const z0 = map.rowToZ(minRow) + inset;
  const z1 = map.rowToZ(maxRow + 1) - inset;
  addTree(x0, z0, 0.6);
  addTree(x1, z0, 0.4);
  addTree(x0, z1, 0.5);
  addTree(x1, z1, 0.7);
}

/** Pontes: tabuleiro, guarda-corpo e pilares, na altura calculada pelo CityMap. */
function createBridges(map: CityMap): Mesh[] {
  const meshes: Mesh[] = [];
  const material = new MeshLambertMaterial({ vertexColors: true });
  const ts = map.tileSize;

  for (const bridge of map.bridges) {
    const { minCol, maxCol, minRow, maxRow, northSouth } = bridge;
    const deckTop = bridge.deckY;
    const cx = map.colToX((minCol + maxCol + 1) / 2);
    const cz = map.rowToZ((minRow + maxRow + 1) / 2);
    const length = ((northSouth ? maxRow - minRow : maxCol - minCol) + 1) * ts;
    const width = 1.7;
    const b = new PartBuilder();
    const along = (l: number, w: number): [number, number] => (northSouth ? [w, l] : [l, w]);

    const [dw, dd] = along(length, width);
    b.box(dw, 0.3, dd, 0, deckTop - 0.3, 0, 0xa8a39a);
    for (const side of [-1, 1]) {
      const [rw, rd] = along(length, 0.12);
      const [ox, oz] = northSouth ? [side * (width / 2 - 0.06), 0] : [0, side * (width / 2 - 0.06)];
      b.box(rw, 0.35, rd, ox, deckTop, oz, 0xe6e1d6);
    }
    for (const t of bridge.tiles) {
      const p = map.tileCenter(t.col, t.row);
      if (p.y > deckTop - 0.6) continue; // só põe pilar onde há vão embaixo
      b.cylinder(0.22, 0.28, deckTop - 0.3 - (p.y - 0.4), p.x - cx, p.y - 0.4, p.z - cz, 0x9a958c, 8);
    }

    const mesh = new Mesh(b.build(), material);
    mesh.position.set(cx, 0, cz);
    mesh.name = 'ponte';
    meshes.push(mesh);
  }
  return meshes;
}
