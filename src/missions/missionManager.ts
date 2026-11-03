import type { SaveData } from '../core/save';
import type { Eixo, GameContent, Mission } from './content';

export interface CompleteResult {
  /** Acabaram as missões do eixo e o próximo começou (mostrar a transição). */
  readonly eixoChanged: boolean;
  /** Acabaram as missões. */
  readonly finished: boolean;
}

/** Uma missão em andamento e o jogador que cuida dela (posição na ordem da vez; 0 = Jogador 1). */
export interface ActiveMission {
  readonly mission: Mission;
  readonly owner: number;
}

export type MissionListener = () => void;

/**
 * Progresso das missões: quais estão em andamento e de quem é cada uma, quais foram concluídas
 * (pins) e em quais a pergunta foi acertada de primeira. Cada jogador cuida de uma missão do eixo
 * atual, ao mesmo tempo; com 1 jogador, isso dá uma missão por vez, na ordem de missions.json.
 */
export class MissionManager {
  private readonly content: GameContent;
  private readonly listeners: MissionListener[] = [];
  private readonly completed = new Set<string>();
  private readonly firstTry = new Set<string>();
  private teamSize: number;
  /** A missão de cada jogador, na ordem da vez (null = está ajudando a equipe). */
  private assigned: (Mission | null)[] = [];

  constructor(content: GameContent, saved: SaveData | null, teamSize: number) {
    this.content = content;
    this.teamSize = teamSize;
    if (saved) this.restore(saved);
    this.deal(0);
  }

  get missions(): readonly Mission[] {
    return this.content.missions;
  }

  get total(): number {
    return this.content.missions.length;
  }

  /** true depois de concluir todas as missões. */
  get isFinished(): boolean {
    return !this.firstOpen;
  }

  /** Eixo em andamento (o da primeira missão não concluída), ou null se todas foram concluídas. */
  get currentEixo(): Eixo | null {
    const mission = this.firstOpen;
    return mission ? this.eixoOf(mission) : null;
  }

  /** Missões em andamento, na ordem de missions.json. */
  get active(): readonly ActiveMission[] {
    const list: ActiveMission[] = [];
    for (const mission of this.content.missions) {
      const owner = this.assigned.indexOf(mission);
      if (owner >= 0) list.push({ mission, owner });
    }
    return list;
  }

  /** Missão de um jogador, ou null se estiver ajudando a equipe. */
  missionOf(player: number): Mission | null {
    return this.assigned[player] ?? null;
  }

  /** Posição da missão em missions.json (0 = primeira). */
  positionOf(mission: Mission): number {
    return this.content.missions.indexOf(mission);
  }

  eixoOf(mission: Mission): Eixo {
    return this.content.eixos.find((e) => e.id === mission.eixo) as Eixo;
  }

  isCompleted(missionId: string): boolean {
    return this.completed.has(missionId);
  }

  wasFirstTry(missionId: string): boolean {
    return this.firstTry.has(missionId);
  }

  get completedCount(): number {
    return this.completed.size;
  }

  get firstTryCount(): number {
    return this.firstTry.size;
  }

  onChange(listener: MissionListener): void {
    this.listeners.push(listener);
  }

  /** Troca o tamanho da equipe e distribui as missões de novo, a partir do Jogador 1. */
  setTeamSize(teamSize: number): void {
    this.teamSize = teamSize;
    this.deal(0);
    this.emit();
  }

  /**
   * Conclui uma missão em andamento (ganha o pin). O dono recebe a próxima missão livre do eixo ou
   * passa a ajudar; quem fez a visita continua com a sua. Se o eixo acabou, as missões do próximo
   * são distribuídas a partir de `nextPlayer`, quem joga em seguida.
   */
  complete(mission: Mission, firstTry: boolean, nextPlayer: number): CompleteResult {
    this.completed.add(mission.id);
    if (firstTry) this.firstTry.add(mission.id);
    const eixo = this.currentEixo;
    const eixoChanged = !!eixo && eixo.id !== mission.eixo;
    if (eixoChanged) {
      this.deal(nextPlayer);
    } else {
      const owner = this.assigned.indexOf(mission);
      if (owner >= 0) this.assigned[owner] = this.nextFree();
    }
    this.emit();
    return { eixoChanged, finished: !eixo };
  }

  reset(): void {
    this.completed.clear();
    this.firstTry.clear();
    this.deal(0);
    this.emit();
  }

  toSave(player: { col: number; row: number } | null): SaveData {
    return {
      version: 1,
      currentMission: this.firstOpen?.id ?? null,
      completed: [...this.completed],
      firstTry: [...this.firstTry],
      player,
    };
  }

  /** Restaura os pins, ignorando ids que não existem mais no conteúdo. */
  private restore(saved: SaveData): void {
    const ids = new Set(this.content.missions.map((m) => m.id));
    for (const id of saved.completed) if (ids.has(id)) this.completed.add(id);
    for (const id of saved.firstTry) if (this.completed.has(id)) this.firstTry.add(id);
  }

  /** A primeira missão ainda não concluída. */
  private get firstOpen(): Mission | undefined {
    return this.content.missions.find((m) => !this.completed.has(m.id));
  }

  /** Entrega as missões do eixo atual, uma para cada jogador, na ordem da vez a partir de `from`. Quem sobra ajuda. */
  private deal(from: number): void {
    this.assigned = Array.from({ length: this.teamSize }, () => null);
    for (let i = 0; i < this.teamSize; i++) {
      this.assigned[(from + i) % this.teamSize] = this.nextFree();
    }
  }

  /** A próxima missão do eixo atual que ainda não foi feita nem está com ninguém. */
  private nextFree(): Mission | null {
    const eixo = this.currentEixo;
    return (
      this.content.missions.find((m) => m.eixo === eixo?.id && !this.completed.has(m.id) && !this.assigned.includes(m)) ?? null
    );
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
