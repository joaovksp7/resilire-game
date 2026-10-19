import { Group, type Scene, type Vector3 } from 'three';
import { createInstitutionBuildings } from './buildings';
import { type CityMap, parseCityMap } from './cityMap';
import { createDecor } from './decor';
import type { InstitutionId } from './institutions';
import { createTerrain } from './terrain';
import { Water } from './water';

export interface City {
  readonly map: CityMap;
  /** Água do rio. O nível muda por eixo (src/world/climate.ts). */
  readonly water: Water;
  readonly root: Group;
  /** Ponto acima da placa de cada instituição (onde fica o marcador da missão). */
  readonly markerAnchors: ReadonlyMap<InstitutionId, Vector3>;
}

/** Monta a cidade inteira (terreno, água, instituições e decoração) e põe na cena. */
export function createCity(scene: Scene): City {
  const map = parseCityMap();
  const water = new Water(map);
  const buildings = createInstitutionBuildings(map);

  const root = new Group();
  root.name = 'cidade';
  root.add(createTerrain(map), water.mesh, buildings.group, createDecor(map));
  scene.add(root);

  return { map, water, root, markerAnchors: buildings.markerAnchors };
}
