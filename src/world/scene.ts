import {
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Scene,
} from 'three';
import { RENDER, WORLD } from '../config';

/**
 * Cena base: céu, luzes e um chão provisório com grade.
 * O chão e a grade são só para conferir a câmera na Fase 1; a cidade (Fase 2) substitui os dois.
 */
export function createScene(): Scene {
  const scene = new Scene();
  scene.background = new Color(RENDER.skyColor);

  const hemi = new HemisphereLight(0xffffff, 0x8fae6b, 1.6);
  scene.add(hemi);

  const sun = new DirectionalLight(0xffffff, 1.4);
  sun.position.set(20, 40, 10);
  scene.add(sun);

  const ground = new Mesh(
    new PlaneGeometry(WORLD.groundSize, WORLD.groundSize),
    new MeshLambertMaterial({ color: 0x9ccc65 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.name = 'chao-provisorio';
  scene.add(ground);

  const grid = new GridHelper(WORLD.groundSize, WORLD.groundSize, 0x5d8a3a, 0x7fae4f);
  grid.position.y = 0.01;
  grid.name = 'grade-provisoria';
  scene.add(grid);

  return scene;
}
