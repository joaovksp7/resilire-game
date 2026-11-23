import { Group, Mesh, type Object3D, type Scene, Vector3 } from 'three';
import { createInstitutionBuildings } from './buildings';
import { type CityMap, parseCityMap } from './cityMap';
import { createDecor, createPlaceScenes } from './decor';
import { CELL_COVER_POINTS, Fader, LABEL_COVER_SHARE, type PointGroup } from './fade';
import type { InstitutionId } from './institutions';
import type { PlaceId } from './layout';
import { createStreetNames } from './streetSigns';
import { createTerrain } from './terrain';
import { Water } from './water';

export interface City {
  readonly map: CityMap;
  /** Água do rio. O nível muda por eixo (src/world/climate.ts). */
  readonly water: Water;
  readonly root: Group;
  /** Ponto acima da placa de cada instituição (onde fica o marcador da missão). */
  readonly markerAnchors: ReadonlyMap<InstitutionId, Vector3>;
  /** Ponto acima de cada lugar que não é instituição (onde fica o marcador da missão). */
  readonly placeAnchors: ReadonlyMap<PlaceId, Vector3>;
  /** O desenho de cada lugar (o acidente). Começa escondido: aparece com a missão em andamento. */
  readonly placeScenes: ReadonlyMap<PlaceId, Object3D>;
  /** Apaga a decoração que tapa boa parte destas casas (as destacadas pelo dado). Lista vazia: volta ao normal. */
  fadeOverCells(cells: readonly { col: number; row: number }[]): void;
}

/** Quanto a grade de pontos de uma casa fica para dentro da borda (fração do tile) e acima do chão. */
const CELL_INSET = 0.2;
const POINT_LIFT = 0.05;
/** Posições da grade 3×3 dentro da casa (fração do tile). */
const CELL_GRID = [CELL_INSET, 0.5, 1 - CELL_INSET];

/**
 * Pontos do meio das letras, um grupo por nome de rua no chão (a faixa tem uma fileira de vértices em
 * cada borda, de 0,25 em 0,25): a cada duas fatias, três pontos entre as bordas.
 */
function labelGroups(names: Object3D): PointGroup[] {
  const groups: PointGroup[] = [];
  const a = new Vector3();
  const b = new Vector3();
  names.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const points: Vector3[] = [];
    const position = object.geometry.getAttribute('position');
    for (let i = 0; i + 1 < position.count; i += 4) {
      a.fromBufferAttribute(position, i);
      b.fromBufferAttribute(position, i + 1);
      for (const t of [0.25, 0.5, 0.75]) points.push(new Vector3().lerpVectors(a, b, t));
    }
    if (points.length > 0) groups.push({ points, min: Math.max(1, Math.ceil(points.length * LABEL_COVER_SHARE)) });
  });
  return groups;
}

/** Uma grade 3×3 de pontos (um pouco para dentro da borda) em cada casa, na altura do chão. */
function cellGroups(map: CityMap, cells: readonly { col: number; row: number }[]): PointGroup[] {
  return cells.map(({ col, row }) => {
    const points: Vector3[] = [];
    for (const fx of CELL_GRID) {
      for (const fz of CELL_GRID) {
        const x = map.colToX(col + fx);
        const z = map.rowToZ(row + fz);
        points.push(new Vector3(x, map.walkHeightAt(x, z) + POINT_LIFT, z));
      }
    }
    return { points, min: CELL_COVER_POINTS };
  });
}

/**
 * Monta a cidade inteira (terreno, água, instituições, decoração, lugares e nome das ruas no chão) e põe
 * na cena. `streetNames`: o nome de cada rua pelo id (content/ruas.json).
 */
export function createCity(scene: Scene, streetNames: ReadonlyMap<string, string>): City {
  const map = parseCityMap();
  const water = new Water(map);
  const fader = new Fader();
  const buildings = createInstitutionBuildings(map);
  const places = createPlaceScenes(map);
  const decor = createDecor(map, fader);
  // Os nomes das ruas fogem dos prédios e das casas (as árvores ficam transparentes, se taparem).
  const names = createStreetNames(map, streetNames, [...buildings.obstacles, ...decor.obstacles]);

  const root = new Group();
  root.name = 'cidade';
  root.add(createTerrain(map), water.mesh, buildings.group, decor.group, names);
  for (const place of places.values()) root.add(place.group);
  scene.add(root);

  // O que tapa boa parte de um nome de rua fica sempre transparente: o nome serve para ler o endereço.
  fader.setFixedGroups(labelGroups(names));

  return {
    map,
    water,
    root,
    markerAnchors: buildings.markerAnchors,
    placeAnchors: new Map([...places].map(([id, place]) => [id, place.anchor])),
    placeScenes: new Map([...places].map(([id, place]) => [id, place.group])),
    fadeOverCells: (cells) => fader.setGroups(cellGroups(map, cells)),
  };
}
