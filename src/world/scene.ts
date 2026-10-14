import { Color, DirectionalLight, HemisphereLight, Scene } from 'three';
import { RENDER } from '../config';

/** Cena base: céu e luzes. A cidade é montada em src/world/city.ts. */
export function createScene(): Scene {
  const scene = new Scene();
  scene.background = new Color(RENDER.skyColor);

  const hemi = new HemisphereLight(0xffffff, 0x8fae6b, 1.5);
  scene.add(hemi);

  // Luz vinda do sul e um pouco do leste: as faces que a câmera vê ficam com tons diferentes.
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(10, 30, 18);
  scene.add(sun);

  return scene;
}
