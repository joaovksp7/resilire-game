import type { SaveData } from '../core/save';
import type { Eixo, GameContent, Mission } from './content';

export interface CompleteResult {
  /** A próxima missão é de outro eixo (mostrar a transição). */
  readonly eixoChanged: boolean;
  /** Acabaram as missões. */
  readonly finished: boolean;
}

export type MissionListener = () => void;

/**
 * Progresso das missões: qual é a atual, quais foram concluídas (pins)
 * e em quais a pergunta foi acertada de primeira.
 */
export class MissionManager {
  private readonly content: GameContent;
  private readonly listeners: MissionListener[] = [];
  private currentIndex = 0;
  private readonly completed = new Set<string>();
  private readonly firstTry = new Set<string>();

  constructor(content: GameContent, saved: SaveData | null) {
    this.content = content;
    if (saved) this.restore(saved);
  }

  get missions(): readonly Mission[] {
    return this.content.missions;
  }

  get total(): number {
    return this.content.missions.length;
  }

  /** Missão em andamento, ou null se todas foram concluídas. */
  get current(): Mission | null {
    return this.content.missions[this.currentIndex] ?? null;
  }

  /** Posição da missão atual (0 = primeira). */
  get index(): number {
    return this.currentIndex;
  }

  get currentEixo(): Eixo | null {
    const mission = this.current;
    return mission ? this.eixoOf(mission) : null;
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

  /** Conclui a missão atual (ganha o pin) e avança para a próxima. */
  complete(firstTry: boolean): CompleteResult {
    const mission = this.current;
    if (!mission) return { eixoChanged: false, finished: true };
    this.completed.add(mission.id);
    if (firstTry) this.firstTry.add(mission.id);
    this.currentIndex = this.nextOpenIndex(this.currentIndex + 1);
    const next = this.current;
    this.emit();
    return { eixoChanged: !!next && next.eixo !== mission.eixo, finished: !next };
  }

  reset(): void {
    this.currentIndex = 0;
    this.completed.clear();
    this.firstTry.clear();
    this.emit();
  }

  toSave(player: { col: number; row: number } | null): SaveData {
    return {
      version: 1,
      currentMission: this.current?.id ?? null,
      completed: [...this.completed],
      firstTry: [...this.firstTry],
      player,
    };
  }

  /** Restaura o progresso, ignorando ids que não existem mais no conteúdo. */
  private restore(saved: SaveData): void {
    const ids = new Set(this.content.missions.map((m) => m.id));
    for (const id of saved.completed) if (ids.has(id)) this.completed.add(id);
    for (const id of saved.firstTry) if (this.completed.has(id)) this.firstTry.add(id);

    if (saved.currentMission === null && this.completed.size === ids.size) {
      this.currentIndex = this.content.missions.length;
      return;
    }
    const savedIndex = this.content.missions.findIndex((m) => m.id === saved.currentMission);
    this.currentIndex = this.nextOpenIndex(savedIndex >= 0 ? savedIndex : 0);
  }

  /** A partir de `from`, a primeira missão ainda não concluída (ou o fim da lista). */
  private nextOpenIndex(from: number): number {
    const list = this.content.missions;
    for (let i = from; i < list.length; i++) if (!this.completed.has(list[i].id)) return i;
    for (let i = 0; i < from && i < list.length; i++) if (!this.completed.has(list[i].id)) return i;
    return list.length;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
