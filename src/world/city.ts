import { Group, type Scene } from 'three';
import { createInstitutionBuildings } from './buildings';
import { type CityMap, parseCityMap } from './cityMap';
import { createDecor } from './decor';
import { createTerrain } from './terrain';
import { Water } from './water';

export interface City {
  readonly map: CityMap;
  /** Água do rio. O nível sobe por eixo na Fase 5. */
  readonly water: Water;
  readonly root: Group;
}

/** Monta a cidade inteira (terreno, água, instituições e decoração) e põe na cena. */
export function createCity(scene: Scene): City {
  const map = parseCityMap();
  const water = new Water(map);

  const root = new Group();
  root.name = 'cidade';
  root.add(createTerrain(map), water.mesh, createInstitutionBuildings(map), createDecor(map));
  scene.add(root);

  return { map, water, root };
}
