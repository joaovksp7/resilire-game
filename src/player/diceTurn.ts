import { PLAYER } from '../config';
import type { CityMap } from '../world/cityMap';
import type { TapPicker } from './clickToMove';
import { Dice3D } from './dice';
import { type Cell, distancesTo, findPath, type Reach, reachableTiles, type WalkGrid } from './pathfinding';
import type { Player } from './player';
import type { ReachHighlight } from './reachHighlight';

/** Etapas de uma jogada. */
export type TurnState = 'waiting' | 'rolling' | 'choosing' | 'walking';

/** Avisos para a interface mostrar (os textos ficam na interface). */
export type TurnHint = 'pick-highlighted' | 'door-too-far' | 'nothing-in-reach';

export interface TurnEvent {
  state: TurnState;
  /** Número tirado no dado (a partir de 'choosing'). */
  value: number | null;
  hint: TurnHint | null;
}

export type TurnListener = (event: TurnEvent) => void;

export interface DiceTurnOptions {
  map: CityMap;
  player: Player;
  dice: Dice3D;
  highlight: ReachHighlight;
  picker: TapPicker;
  /** Casas bloqueadas além das não caminháveis (ex.: ruas alagadas, na Fase 5). */
  isBlocked?: (col: number, row: number) => boolean;
  /** Casas pintadas de outra cor quando ao alcance (ex.: porta da missão, na Fase 4). */
  isSpecial?: (cell: Cell) => boolean;
}

/**
 * Movimento por dado, como num jogo de tabuleiro:
 * jogar o dado → escolher uma casa destacada (a até N passos) → andar casa por casa → jogar de novo.
 */
export class DiceTurn {
  private readonly opts: DiceTurnOptions;
  private readonly grid: WalkGrid;
  private readonly listeners: TurnListener[] = [];
  private current: TurnState = 'waiting';
  private value: number | null = null;
  private reach: Reach | null = null;
  private paused = false;
  /** Muda a cada jogada; descarta o fim de uma rolagem que foi cancelada. */
  private rollToken = 0;

  constructor(opts: DiceTurnOptions) {
    this.opts = opts;
    const { map, isBlocked } = opts;
    this.grid = {
      cols: map.cols,
      rows: map.rows,
      isWalkable: (col, row) => !!map.tile(col, row)?.walkable && !isBlocked?.(col, row),
    };
    opts.player.onArrive(() => {
      if (this.current === 'walking') this.setState('waiting');
    });
  }

  get state(): TurnState {
    return this.current;
  }

  onChange(listener: TurnListener): void {
    this.listeners.push(listener);
  }

  /** Pausa a vez (ex.: com diálogo ou cartão aberto): não joga o dado nem aceita toques. */
  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** Volta para o começo da vez, sem dado nem casas destacadas (ex.: ao recomeçar o jogo). */
  reset(): void {
    this.rollToken++;
    this.reach = null;
    this.opts.highlight.hide();
    this.opts.dice.dismiss();
    this.setState('waiting');
  }

  /** Joga o dado (só quando é a vez de jogar). */
  roll(): void {
    if (this.current !== 'waiting' || this.paused) return;
    const { dice, player, highlight } = this.opts;
    const value = Dice3D.draw();
    const token = ++this.rollToken;
    this.value = value;
    this.setState('rolling');

    void dice.roll(value, player.position).then(() => {
      if (token !== this.rollToken) return;
      const start = player.cell;
      this.reach = start ? reachableTiles(this.grid, start, value) : null;
      if (!this.reach || this.reach.cells.length === 0) {
        dice.dismiss();
        this.value = null;
        this.setState('waiting', 'nothing-in-reach');
        return;
      }
      highlight.show(this.reach.cells, this.opts.isSpecial);
      this.setState('choosing');
    });
  }

  /** Toque na tela durante a escolha: anda até a casa destacada tocada (ou a mais perto do toque). */
  handleTap(clientX: number, clientY: number): void {
    if (this.current !== 'choosing' || !this.reach || this.paused) return;
    const { map, picker } = this.opts;
    const target = picker.pick(clientX, clientY);
    if (!target) return;

    if (target.kind === 'institution') {
      const { door } = target.site;
      if (this.reach.stepsTo(door.col, door.row) === undefined) {
        this.setState('choosing', 'door-too-far');
        return;
      }
      this.walkTo(door, target.faceYaw);
      return;
    }

    // Chão: aceita a casa destacada mais perto do ponto tocado, dentro da tolerância.
    const { x, z } = target.point;
    const maxDist = PLAYER.tapTolerance * map.tileSize;
    let best: Cell | null = null;
    let bestDist = maxDist * maxDist;
    for (const cell of this.reach.cells) {
      const dx = map.colToX(cell.col + 0.5) - x;
      const dz = map.rowToZ(cell.row + 0.5) - z;
      const d = dx * dx + dz * dz;
      if (d <= bestDist) {
        bestDist = d;
        best = cell;
      }
    }
    if (best) this.walkTo(best, null);
    else this.setState('choosing', 'pick-highlighted');
  }

  /**
   * Escolhe sozinho a casa destacada mais perto do destino `goal` (para quem joga só com teclado).
   * Se o destino estiver ao alcance, vai direto até ele. Devolve false se nada aproxima do destino.
   */
  goTowards(goal: Cell, faceYaw: number | null = null): boolean {
    if (this.current !== 'choosing' || !this.reach || this.paused) return false;
    if (this.reach.stepsTo(goal.col, goal.row) !== undefined) {
      this.walkTo(goal, faceYaw);
      return true;
    }
    const dist = distancesTo(this.grid, goal);
    const start = this.opts.player.cell;
    let best: Cell | null = null;
    let bestDist = start ? dist[start.row * this.grid.cols + start.col] : -1;
    if (bestDist < 0) bestDist = Infinity;
    for (const cell of this.reach.cells) {
      const d = dist[cell.row * this.grid.cols + cell.col];
      if (d >= 0 && d < bestDist) {
        bestDist = d;
        best = cell;
      }
    }
    if (!best) return false;
    this.walkTo(best, null);
    return true;
  }

  private walkTo(cell: Cell, faceYaw: number | null): void {
    const { player, highlight, dice } = this.opts;
    const reach = this.reach;
    const start = player.cell;
    if (!reach || !start || this.value === null) return;

    // A* (prefere menos curvas); se por algum motivo passar do número do dado, usa o caminho da busca.
    let path = findPath(this.grid, start, cell);
    if (!path || path.length - 1 > this.value) path = reach.pathTo(cell.col, cell.row);
    if (!path) return;

    highlight.hide();
    dice.dismiss();
    this.reach = null;
    this.setState('walking');
    player.walk(path, faceYaw);
  }

  private setState(state: TurnState, hint: TurnHint | null = null): void {
    this.current = state;
    if (state === 'waiting') this.value = null;
    const event: TurnEvent = {
      state,
      value: state === 'choosing' || state === 'walking' ? this.value : null,
      hint,
    };
    for (const listener of this.listeners) listener(event);
  }
}
