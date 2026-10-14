import { BufferAttribute, BufferGeometry, Color, Mesh, MeshLambertMaterial } from 'three';
import { TERRAIN_COLORS, WORLD } from '../config';
import { type CityMap, type Tile, tileNoise } from './cityMap';

function tileColor(map: CityMap, tile: Tile, out: Color): Color {
  switch (tile.kind) {
    case 'street':
      return out.setHex(TERRAIN_COLORS.street);
    case 'plaza':
      return out.setHex(TERRAIN_COLORS.plaza);
    case 'bank':
      return out.setHex(TERRAIN_COLORS.bank);
    case 'river':
    case 'bridge':
      return out.setHex(TERRAIN_COLORS.riverBed);
    case 'institution':
      return out.setHex(TERRAIN_COLORS.lot);
    default: {
      const { col, row } = tile;
      const heights = [
        map.cornerHeight(col, row),
        map.cornerHeight(col + 1, row),
        map.cornerHeight(col, row + 1),
        map.cornerHeight(col + 1, row + 1),
      ];
      const steep = Math.max(...heights) - Math.min(...heights) >= 0.75 * WORLD.levelHeight;
      out.setHex(steep ? TERRAIN_COLORS.slope : tile.level >= 3 ? TERRAIN_COLORS.grassHigh : TERRAIN_COLORS.grass);
      // Pequena variação por tile para o gramado não ficar chapado demais.
      return out.multiplyScalar(0.95 + tileNoise(col, row, 1) * 0.1);
    }
  }
}

/**
 * Terreno low-poly numa malha só: dois triângulos por tile, cor por tile,
 * e as laterais da "maquete" na borda do mapa.
 */
export function createTerrain(map: CityMap): Mesh {
  const ts = map.tileSize;
  const baseY = -WORLD.baseDepth;
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new Color();

  const vertex = (x: number, y: number, z: number, c: Color): void => {
    positions.push(x, y, z);
    colors.push(c.r, c.g, c.b);
  };

  // Superfície: triângulos (NO, SO, SE) e (NO, SE, NE) — mesma divisão usada em CityMap.heightAt.
  for (const tile of map.tiles) {
    const { col, row } = tile;
    const x0 = map.colToX(col);
    const z0 = map.rowToZ(row);
    const x1 = x0 + ts;
    const z1 = z0 + ts;
    const h00 = map.cornerHeight(col, row);
    const h10 = map.cornerHeight(col + 1, row);
    const h01 = map.cornerHeight(col, row + 1);
    const h11 = map.cornerHeight(col + 1, row + 1);
    tileColor(map, tile, color);
    vertex(x0, h00, z0, color);
    vertex(x0, h01, z1, color);
    vertex(x1, h11, z1, color);
    vertex(x0, h00, z0, color);
    vertex(x1, h11, z1, color);
    vertex(x1, h10, z0, color);
  }

  // Laterais: cada borda é percorrida no sentido em que a face fica virada para fora.
  const top = new Color(TERRAIN_COLORS.side);
  const bottom = top.clone().multiplyScalar(0.7);
  const wall = (xa: number, ha: number, za: number, xb: number, hb: number, zb: number): void => {
    vertex(xa, baseY, za, bottom);
    vertex(xb, baseY, zb, bottom);
    vertex(xb, hb, zb, top);
    vertex(xa, baseY, za, bottom);
    vertex(xb, hb, zb, top);
    vertex(xa, ha, za, top);
  };
  const { cols, rows } = map;
  for (let i = 0; i < cols; i++) {
    // Sul (para fora = +z): de oeste para leste.
    wall(map.colToX(i), map.cornerHeight(i, rows), map.rowToZ(rows), map.colToX(i + 1), map.cornerHeight(i + 1, rows), map.rowToZ(rows));
    // Norte (para fora = -z): de leste para oeste.
    wall(map.colToX(i + 1), map.cornerHeight(i + 1, 0), map.rowToZ(0), map.colToX(i), map.cornerHeight(i, 0), map.rowToZ(0));
  }
  for (let j = 0; j < rows; j++) {
    // Leste (para fora = +x): de sul para norte.
    wall(map.colToX(cols), map.cornerHeight(cols, j + 1), map.rowToZ(j + 1), map.colToX(cols), map.cornerHeight(cols, j), map.rowToZ(j));
    // Oeste (para fora = -x): de norte para sul.
    wall(map.colToX(0), map.cornerHeight(0, j), map.rowToZ(j), map.colToX(0), map.cornerHeight(0, j + 1), map.rowToZ(j + 1));
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.computeVertexNormals();

  const mesh = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'terreno';
  return mesh;
}
