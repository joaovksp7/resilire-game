import { Color, DirectionalLight, HemisphereLight, Scene } from 'three';
import { RENDER } from '../config';

/** Luzes da cena. O clima de cada eixo muda a força delas (src/world/climate.ts). */
export interface SceneLights {
  readonly hemi: HemisphereLight;
  readonly sun: DirectionalLight;
}

/** Cena base: céu e luzes. A cidade é montada em src/world/city.ts. */
export function createScene(): { scene: Scene; lights: SceneLights } {
  const scene = new Scene();
  scene.background = new Color(RENDER.skyColor);

  const hemi = new HemisphereLight(0xffffff, 0x8fae6b, 1.5);
  scene.add(hemi);

  // Luz vinda do sul e um pouco do leste: as faces que a câmera vê ficam com tons diferentes.
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(10, 30, 18);
  scene.add(sun);

  return { scene, lights: { hemi, sun } };
}
