import { BoxGeometry, type Color, Mesh, MeshLambertMaterial } from 'three';
import { TERRAIN_COLORS, WORLD } from '../config';
import type { CityMap } from './cityMap';

/**
 * Água do rio: um bloco que cobre o mapa inteiro e fica escondido sob o terreno
 * onde o chão é mais alto que ela. Subir o nível alaga as partes baixas sozinho.
 */
export class Water {
  readonly mesh: Mesh;
  private readonly material: MeshLambertMaterial;
  private readonly baseY = -WORLD.baseDepth + 0.01;
  private currentLevel = 0;

  constructor(map: CityMap) {
    // Um pouco menor que o mapa, para as laterais da maquete ficarem na frente.
    const geometry = new BoxGeometry(map.cols * map.tileSize - 0.04, 1, map.rows * map.tileSize - 0.04);
    geometry.translate(0, 0.5, 0);
    this.material = new MeshLambertMaterial({ color: TERRAIN_COLORS.water, transparent: true, opacity: 0.82 });
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.name = 'agua';
    this.mesh.position.y = this.baseY;
    this.setLevel(WORLD.initialWaterLevel);
  }

  /** Nível atual, em níveis do terreno (0 = fundo do rio). */
  get level(): number {
    return this.currentLevel;
  }

  /** Altura da superfície da água no mundo. */
  get surfaceY(): number {
    return this.currentLevel * WORLD.levelHeight;
  }

  setLevel(level: number): void {
    this.currentLevel = level;
    this.mesh.scale.y = Math.max(0.01, this.surfaceY - this.baseY);
  }

  /** Cor da água (fica mais turva quando o rio enche). */
  setColor(color: Color): void {
    this.material.color.copy(color);
  }
}
