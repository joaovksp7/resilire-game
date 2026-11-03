import { Group, MathUtils, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from 'three';
import { CAMERA, TEAM } from '../config';
import type { CityMap } from '../world/cityMap';
import { Character } from './character';
import { type ArriveListener, Player } from './player';
import type { Team, TeamPlayer } from './team';

export type TurnChangeListener = (pawn: Player) => void;

/** Direção em que os peões ficam ao sair de casa: de frente para a câmera. */
const HOME_YAW = Math.PI / 4;
/** Quanto o anel fica acima do chão. */
const RING_LIFT = 0.05;
/** Distância usada para medir a inclinação do chão embaixo do anel. */
const SLOPE_SAMPLE = 0.25;
const UP = new Vector3(0, 1, 0);
// O anel é desenhado depois da cidade, para um prédio na frente não esconder de quem é a vez,
// e antes dos peões, para não passar por cima das pernas.
const RING_RENDER_ORDER = 1;
const PAWN_RENDER_ORDER = 2;

/** Direção da direita da tela no chão: peões da mesma casa ficam em fila nela e um não esconde o outro. */
const SCREEN_RIGHT = (() => {
  const yaw = MathUtils.degToRad(CAMERA.yawDeg);
  return new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
})();

/**
 * Os peões da equipe, um por jogador, cada um com a sua cor. Cuida de quem está na partida, de quem
 * é a vez, do anel no peão da vez e de deixar lado a lado quem divide a mesma casa.
 * Os peões existem desde o começo; quem não está na equipe fica escondido.
 */
export class Pawns {
  /** O que vai para a cena: os peões e o anel. */
  readonly object = new Group();
  private readonly map: CityMap;
  private readonly pool: readonly Player[];
  private readonly ring: Mesh;
  private readonly ringMaterial = new MeshBasicMaterial({ depthTest: false, depthWrite: false });
  private readonly slopeNormal = new Vector3();
  private readonly arriveListeners: ArriveListener[] = [];
  private readonly turnListeners: TurnChangeListener[] = [];
  private currentTeam: Team = [];
  private members: readonly Player[] = [];
  private turn = 0;

  constructor(map: CityMap, team: Team) {
    this.map = map;
    this.object.name = 'peoes';
    this.pool = TEAM.colors.map((color) => new Player(map, new Character(color)));
    for (const pawn of this.pool) {
      this.object.add(pawn.object);
      pawn.object.traverse((part) => {
        part.renderOrder = PAWN_RENDER_ORDER;
      });
      pawn.onArrive((cell) => {
        for (const listener of this.arriveListeners) listener(cell);
      });
    }

    const geometry = new RingGeometry(TEAM.ringInner, TEAM.ringOuter, 32);
    geometry.rotateX(-Math.PI / 2);
    this.ring = new Mesh(geometry, this.ringMaterial);
    this.ring.name = 'anel-da-vez';
    this.ring.renderOrder = RING_RENDER_ORDER;
    this.object.add(this.ring);

    this.setTeam(team);
  }

  get team(): Team {
    return this.currentTeam;
  }

  /** Os peões de quem está na partida, na ordem da vez. */
  get all(): readonly Player[] {
    return this.members;
  }

  /** Peão do Jogador 1. */
  get first(): Player {
    return this.members[0];
  }

  /** Posição de quem está na vez, na ordem da equipe (0 = Jogador 1). */
  get activeIndex(): number {
    return this.turn;
  }

  /** Posição de quem joga em seguida. Com 1 jogador, não muda. */
  get nextIndex(): number {
    return (this.turn + 1) % this.members.length;
  }

  /** Peão de quem está na vez. */
  get active(): Player {
    return this.members[this.turn];
  }

  /** Jogador que está na vez. */
  get activeMember(): TeamPlayer {
    return this.currentTeam[this.turn];
  }

  /** Chamado quando qualquer peão chega ao fim de um caminho. */
  onArrive(listener: ArriveListener): void {
    this.arriveListeners.push(listener);
  }

  /** Chamado quando a vez muda de mãos, ou quando volta para o Jogador 1 ao recomeçar. */
  onTurnChange(listener: TurnChangeListener): void {
    this.turnListeners.push(listener);
  }

  /** Troca a equipe: mostra um peão por jogador e leva todos para a porta de casa. */
  setTeam(team: Team): void {
    this.currentTeam = team;
    this.members = this.pool.slice(0, team.length);
    this.pool.forEach((pawn, index) => {
      pawn.object.visible = index < team.length;
    });
    // Com 1 jogador não há vez para mostrar.
    this.ring.visible = team.length > 1;
    this.goHome();
  }

  /** Todos na porta de casa, e a vez volta para o Jogador 1. */
  goHome(): void {
    const home = this.map.sites.get('casa');
    if (home) for (const pawn of this.members) pawn.placeAt(home.door.col, home.door.row, HOME_YAW);
    this.turn = 0;
    this.emitTurn();
  }

  /** Passa a vez para o próximo da ordem. Com 1 jogador, não muda nada. */
  nextTurn(): void {
    if (this.members.length < 2) return;
    this.turn = this.nextIndex;
    this.emitTurn();
  }

  update(dt: number): void {
    this.spreadOut();
    for (const pawn of this.members) pawn.update(dt);
    this.placeRing();
  }

  private emitTurn(): void {
    this.ringMaterial.color.setHex(this.activeMember.color);
    for (const listener of this.turnListeners) listener(this.active);
  }

  /** Quem divide uma casa fica em fila na tela, sem se sobrepor. Quem está andando vai pelo meio da rua. */
  private spreadOut(): void {
    const resting = this.members.filter((pawn) => !pawn.isMoving);
    for (const pawn of this.members) {
      const cell = pawn.cell;
      const mates = resting.filter((other) => {
        const at = other.cell;
        return at?.col === cell?.col && at?.row === cell?.row;
      });
      const slot = pawn.isMoving ? 0 : mates.indexOf(pawn) - (mates.length - 1) / 2;
      const distance = slot * TEAM.pawnSpacing;
      pawn.setSpread(SCREEN_RIGHT.x * distance, SCREEN_RIGHT.z * distance);
    }
  }

  /** O anel fica embaixo do peão da vez e acompanha a inclinação da ladeira, para não entrar no chão. */
  private placeRing(): void {
    if (!this.ring.visible) return;
    const { x, y, z } = this.active.object.position;
    const { map } = this;
    this.slopeNormal
      .set(
        map.walkHeightAt(x - SLOPE_SAMPLE, z) - map.walkHeightAt(x + SLOPE_SAMPLE, z),
        SLOPE_SAMPLE * 2,
        map.walkHeightAt(x, z - SLOPE_SAMPLE) - map.walkHeightAt(x, z + SLOPE_SAMPLE),
      )
      .normalize();
    this.ring.quaternion.setFromUnitVectors(UP, this.slopeNormal);
    this.ring.position.set(x, y + RING_LIFT, z);
  }
}
