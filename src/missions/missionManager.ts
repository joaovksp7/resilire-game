import type { SaveData, SavedCell, SavedPlayer } from '../core/save';
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
 * (pins), quem buscou cada pin e em quais a pergunta foi acertada de primeira. Cada jogador cuida de uma missão, ao
 * mesmo tempo, na ordem de missions.json: quem termina pega a próxima livre, mesmo que seja do eixo seguinte. Com 1
 * jogador, isso dá uma missão por vez. O eixo atual (clima) é o da primeira missão não concluída.
 */
export class MissionManager {
  private readonly content: GameContent;
  private readonly listeners: MissionListener[] = [];
  /** Pins conquistados, na ordem em que foram buscados: id da missão → quem buscou (posição na ordem da vez). */
  private readonly completed = new Map<string, number>();
  private readonly firstTry = new Set<string>();
  private teamSize: number;
  /** A missão de cada jogador, na ordem da vez (null = está ajudando a equipe: não sobrou missão livre). */
  private assigned: (Mission | null)[] = [];

  constructor(content: GameContent, saved: SaveData | null, teamSize: number) {
    this.content = content;
    this.teamSize = teamSize;
    if (saved) this.restore(saved);
    else this.deal(0);
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

  /** Quem buscou o pin (posição na ordem da vez), ou null se a missão não foi concluída. */
  foundBy(missionId: string): number | null {
    return this.completed.get(missionId) ?? null;
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
   * Conclui uma missão em andamento (ganha o pin), guardando quem fez a visita (`visitor`). O dono
   * recebe a próxima missão livre (de qualquer eixo) ou, se não sobrar nenhuma, passa a ajudar; quem
   * fez a visita continua com a sua. O eixo muda quando todas as missões dele foram concluídas.
   */
  complete(mission: Mission, firstTry: boolean, visitor: number): CompleteResult {
    const before = this.currentEixo;
    this.completed.set(mission.id, visitor);
    if (firstTry) this.firstTry.add(mission.id);
    const eixo = this.currentEixo;
    // Compara com o eixo de antes: concluir uma missão adiantada (de um eixo seguinte) não muda o eixo.
    const eixoChanged = !!eixo && eixo.id !== before?.id;
    const owner = this.assigned.indexOf(mission);
    if (owner >= 0) this.assigned[owner] = this.nextFree();
    this.emit();
    return { eixoChanged, finished: !eixo };
  }

  reset(): void {
    this.completed.clear();
    this.firstTry.clear();
    this.deal(0);
    this.emit();
  }

  /**
   * O progresso para salvar. `names` são os nomes digitados e `cells` as casas dos peões, na ordem
   * da vez; `turn` é de quem é a vez.
   */
  toSave(names: readonly string[], cells: readonly (SavedCell | null)[], turn: number): SaveData {
    const players: SavedPlayer[] = names.map((name, index) => ({
      name,
      cell: cells[index] ? { col: cells[index].col, row: cells[index].row } : null,
      mission: this.assigned[index]?.id ?? null,
    }));
    return {
      version: 3,
      players,
      turn,
      pins: [...this.completed].map(([mission, by]) => ({ mission, by })),
      firstTry: [...this.firstTry],
    };
  }

  /**
   * Restaura os pins e a missão de cada jogador. Ids que não existem mais no conteúdo são ignorados,
   * e missão que não vale mais (já concluída ou repetida) é trocada pela próxima livre, para
   * ninguém ficar sem missão enquanto sobra alguma.
   */
  private restore(saved: SaveData): void {
    const byId = new Map(this.content.missions.map((m) => [m.id, m]));
    for (const pin of saved.pins) {
      if (byId.has(pin.mission) && pin.by < this.teamSize) this.completed.set(pin.mission, pin.by);
    }
    for (const id of saved.firstTry) if (this.completed.has(id)) this.firstTry.add(id);

    if (saved.players.length !== this.teamSize) {
      this.deal(0);
      return;
    }
    this.assigned = Array.from({ length: this.teamSize }, () => null);
    saved.players.forEach((player, index) => {
      const mission = player.mission ? byId.get(player.mission) : undefined;
      const valid = !!mission && !this.completed.has(mission.id) && !this.assigned.includes(mission);
      if (valid) this.assigned[index] = mission;
    });
    for (let i = 0; i < this.teamSize; i++) {
      if (!this.assigned[i]) this.assigned[i] = this.nextFree();
    }
  }

  /** A primeira missão ainda não concluída. */
  private get firstOpen(): Mission | undefined {
    return this.content.missions.find((m) => !this.completed.has(m.id));
  }

  /** Entrega as primeiras missões livres, uma para cada jogador, na ordem da vez a partir de `from`. Quem sobra ajuda. */
  private deal(from: number): void {
    this.assigned = Array.from({ length: this.teamSize }, () => null);
    for (let i = 0; i < this.teamSize; i++) {
      this.assigned[(from + i) % this.teamSize] = this.nextFree();
    }
  }

  /** A próxima missão de missions.json (de qualquer eixo) que ainda não foi feita nem está com ninguém. */
  private nextFree(): Mission | null {
    return this.content.missions.find((m) => !this.completed.has(m.id) && !this.assigned.includes(m)) ?? null;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
