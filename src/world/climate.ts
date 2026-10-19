import { Color, MathUtils, type Scene } from 'three';
import { CLIMATE, WORLD } from '../config';
import type { EixoId, GameContent } from '../missions/content';
import { prefersReducedMotion } from '../player/character';
import type { CityMap } from './cityMap';
import type { Rain } from './rain';
import type { SceneLights } from './scene';
import type { Water } from './water';

type ClimatePreset = (typeof CLIMATE.eixos)[EixoId];

/** Valores do clima que mudam aos poucos na troca de eixo. */
interface ClimateState {
  readonly sky: Color;
  ambient: number;
  sun: number;
  waterLevel: number;
  readonly waterColor: Color;
  rain: number;
}

function newState(): ClimateState {
  return { sky: new Color(), ambient: 0, sun: 0, waterLevel: 0, waterColor: new Color(), rain: 0 };
}

function setFromPreset(out: ClimateState, preset: ClimatePreset): void {
  out.sky.setHex(preset.sky);
  out.ambient = preset.ambient;
  out.sun = preset.sun;
  out.waterLevel = preset.waterLevel;
  out.waterColor.setHex(preset.waterColor);
  out.rain = preset.rain;
}

function copyState(out: ClimateState, from: ClimateState): void {
  out.sky.copy(from.sky);
  out.ambient = from.ambient;
  out.sun = from.sun;
  out.waterLevel = from.waterLevel;
  out.waterColor.copy(from.waterColor);
  out.rain = from.rain;
}

/**
 * Casas caminháveis (rua, praça, ponte) com o chão abaixo da água no clima do eixo: 1 = alagada.
 * Índice = row * cols + col.
 */
export function floodedTiles(map: CityMap, eixo: EixoId): Uint8Array {
  const surface = CLIMATE.eixos[eixo].waterLevel * WORLD.levelHeight;
  const out = new Uint8Array(map.cols * map.rows);
  for (const tile of map.tiles) {
    if (!tile.walkable) continue;
    const x = map.colToX(tile.col + 0.5);
    const z = map.rowToZ(tile.row + 0.5);
    if (map.walkHeightAt(x, z) < surface) out[tile.row * map.cols + tile.col] = 1;
  }
  return out;
}

/**
 * Confere se alguma missão manda o jogador para uma porta que fica embaixo d'água no clima
 * do próprio eixo (ele não conseguiria chegar). Devolve a mensagem para a equipe de conteúdo, ou null.
 */
export function floodedDoorProblem(map: CityMap, content: GameContent): string | null {
  const byEixo = new Map<EixoId, Uint8Array>();
  for (const mission of content.missions) {
    const door = map.sites.get(mission.instituicao)?.door;
    if (!door) continue;
    let flooded = byEixo.get(mission.eixo);
    if (!flooded) {
      flooded = floodedTiles(map, mission.eixo);
      byEixo.set(mission.eixo, flooded);
    }
    if (flooded[door.row * map.cols + door.col] !== 1) continue;
    const inst = content.institutions.get(mission.instituicao)?.nome ?? mission.instituicao;
    const eixo = content.eixos.find((e) => e.id === mission.eixo)?.nome ?? mission.eixo;
    return (
      `content/missions.json: missão "${mission.id}": no eixo "${eixo}" a porta da instituição "${inst}" ` +
      'fica embaixo d’água e o jogador não consegue chegar. Escolha uma instituição da parte alta da cidade.'
    );
  }
  return null;
}

export interface ClimateDeps {
  scene: Scene;
  lights: SceneLights;
  water: Water;
  rain: Rain;
  map: CityMap;
}

/**
 * Clima da cidade por eixo (valores em CLIMATE, no config.ts): cor do céu, luzes, nível e cor
 * do rio e quantidade de chuva. Também diz quais ruas estão alagadas.
 */
export class Climate {
  private readonly d: ClimateDeps;
  private readonly from = newState();
  private readonly to = newState();
  private readonly now = newState();
  /** De 0 a 1 durante a mudança de eixo; 1 = parado no clima do eixo. */
  private progress = 1;
  private currentEixo: EixoId;
  private flooded: Uint8Array;

  constructor(deps: ClimateDeps, eixo: EixoId) {
    this.d = deps;
    // O céu da cena é a mesma cor que a transição vai mudando.
    deps.scene.background = this.now.sky;
    this.currentEixo = eixo;
    this.flooded = floodedTiles(deps.map, eixo);
    setFromPreset(this.to, CLIMATE.eixos[eixo]);
    this.applyProgress();
  }

  get eixo(): EixoId {
    return this.currentEixo;
  }

  /**
   * Passa para o clima do eixo. `animate`: muda aos poucos (CLIMATE.transitionSeconds);
   * senão, ou com prefers-reduced-motion, muda na hora. As ruas alagam já no começo da mudança.
   */
  set(eixo: EixoId, animate: boolean): void {
    this.currentEixo = eixo;
    this.flooded = floodedTiles(this.d.map, eixo);
    copyState(this.from, this.now);
    setFromPreset(this.to, CLIMATE.eixos[eixo]);
    this.progress = animate && !prefersReducedMotion() ? 0 : 1;
    this.applyProgress();
  }

  /** true se a casa está alagada no eixo atual: o dado não destaca e não dá para passar. */
  isFlooded(col: number, row: number): boolean {
    const { cols, rows } = this.d.map;
    if (col < 0 || row < 0 || col >= cols || row >= rows) return false;
    return this.flooded[row * cols + col] === 1;
  }

  update(dt: number): void {
    if (this.progress >= 1) return;
    this.progress = Math.min(1, this.progress + dt / CLIMATE.transitionSeconds);
    this.applyProgress();
  }

  private applyProgress(): void {
    const { from, to, now } = this;
    const { lights, water, rain } = this.d;
    if (this.progress >= 1) {
      copyState(now, to);
    } else {
      const t = MathUtils.smoothstep(this.progress, 0, 1);
      now.sky.lerpColors(from.sky, to.sky, t);
      now.ambient = MathUtils.lerp(from.ambient, to.ambient, t);
      now.sun = MathUtils.lerp(from.sun, to.sun, t);
      now.waterLevel = MathUtils.lerp(from.waterLevel, to.waterLevel, t);
      now.waterColor.lerpColors(from.waterColor, to.waterColor, t);
      now.rain = MathUtils.lerp(from.rain, to.rain, t);
    }
    lights.hemi.intensity = now.ambient;
    lights.sun.intensity = now.sun;
    water.setLevel(now.waterLevel);
    water.setColor(now.waterColor);
    rain.setAmount(now.rain);
  }
}
