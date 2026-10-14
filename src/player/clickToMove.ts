import { type Camera, type Object3D, Raycaster, Vector2, type Vector3 } from 'three';
import type { CityMap, InstitutionSite } from '../world/cityMap';
import type { InstitutionId } from '../world/institutions';

export interface TapPickerOptions {
  map: CityMap;
  camera: Camera;
  canvas: HTMLCanvasElement;
  /** O que pode ser tocado (a cidade). Personagem, dado e destaques ficam de fora. */
  pickRoot: Object3D;
}

/** O que o toque acertou: um prédio de instituição ou um ponto do chão (rua, grama, casa, água…). */
export type TapTarget =
  | { kind: 'institution'; site: InstitutionSite; faceYaw: number }
  | { kind: 'ground'; point: Vector3 };

/** Sobe na hierarquia até achar o id da instituição marcado no grupo do prédio. */
function institutionOf(object: Object3D | null): InstitutionId | null {
  for (let o = object; o; o = o.parent) {
    const id = o.userData.institution as InstitutionId | undefined;
    if (id) return id;
  }
  return null;
}

/**
 * Descobre o que está embaixo de um toque/clique na tela.
 * Quem decide se dá para andar até lá é o DiceTurn (casas destacadas pelo dado).
 */
export class TapPicker {
  private readonly opts: TapPickerOptions;
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();

  constructor(opts: TapPickerOptions) {
    this.opts = opts;
  }

  pick(clientX: number, clientY: number): TapTarget | null {
    const { map, camera, canvas, pickRoot } = this.opts;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, camera);

    const hit = this.raycaster.intersectObject(pickRoot, true)[0];
    if (!hit) return null;

    const id = institutionOf(hit.object);
    const site = id ? map.sites.get(id) : undefined;
    if (site) {
      // De frente para o prédio: da porta em direção ao centro do bloco.
      const bx = map.colToX((site.minCol + site.maxCol + 1) / 2) - map.colToX(site.door.col + 0.5);
      const bz = map.rowToZ((site.minRow + site.maxRow + 1) / 2) - map.rowToZ(site.door.row + 0.5);
      return { kind: 'institution', site, faceYaw: Math.atan2(bx, bz) };
    }
    return { kind: 'ground', point: hit.point.clone() };
  }
}
