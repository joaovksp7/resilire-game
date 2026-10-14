import type { Vector3 } from 'three';
import type { SaveStore } from '../core/save';
import { faceYawFor } from '../player/clickToMove';
import type { DiceTurn } from '../player/diceTurn';
import type { Cell } from '../player/pathfinding';
import type { Player } from '../player/player';
import { showCard } from '../ui/cards';
import type { DialogueBox } from '../ui/dialogue';
import type { DiceHud } from '../ui/diceHud';
import type { EdgeArrow } from '../ui/edgeArrow';
import type { CityMap } from '../world/cityMap';
import type { InstitutionId } from '../world/institutions';
import { INSTITUTION_STYLES } from '../world/institutions';
import type { MissionMarker } from '../world/markers';
import type { GameContent, Mission } from './content';
import type { MissionManager } from './missionManager';

// Textos da interface (não são conteúdo educativo).
const TEXT = {
  missionOf: (n: number, total: number, eixo: string) => `Missão ${n} de ${total} · ${eixo}`,
  destination: (name: string) => `Destino: ${name}`,
  go: 'Vamos lá',
  pinKicker: 'Pin conquistado',
  firstTry: 'Você acertou de primeira!',
  next: 'Continuar',
  eixoKicker: 'Novo eixo',
  wrongDoor: (here: string, goal: string) => `Você está ${here}. Sua missão agora é ${goal}.`,
  endTitle: 'Você completou todas as missões!',
  endText: (pins: number, total: number, first: number) =>
    `Pins: ${pins} de ${total}. Acertos de primeira: ${first} de ${total}.`,
  close: 'Fechar',
} as const;

export interface MissionFlowDeps {
  content: GameContent;
  manager: MissionManager;
  save: SaveStore;
  map: CityMap;
  player: Player;
  turn: DiceTurn;
  marker: MissionMarker;
  markerAnchors: ReadonlyMap<InstitutionId, Vector3>;
  dialogue: DialogueBox;
  diceHud: DiceHud;
  edgeArrow: EdgeArrow;
  /** Onde ficam os cartões. */
  uiRoot: HTMLElement;
}

const sameCell = (a: Cell | null, b: Cell): boolean => !!a && a.col === b.col && a.row === b.row;

/**
 * O loop das missões: cartão da missão → jogar o dado até a porta → diálogo → pergunta →
 * pin → (troca de eixo) → próxima missão. Salva o progresso a cada passo.
 */
export class MissionFlow {
  private readonly d: MissionFlowDeps;
  private visiting = false;

  constructor(deps: MissionFlowDeps) {
    this.d = deps;
    deps.player.onArrive((cell) => this.onArrive(cell));
    deps.diceHud.setGoTowards(() => this.goTowardsMission());
  }

  /** Começa (ou continua) o jogo: mostra a missão atual e confere se já está na porta. */
  async start(): Promise<void> {
    this.refreshTarget();
    if (!this.d.manager.current) return;
    await this.showMissionCard();
    this.checkDoor(this.d.player.cell);
  }

  /** Apaga o progresso e volta para a primeira missão, em casa. */
  async restart(): Promise<void> {
    const { manager, save, map, player, turn } = this.d;
    manager.reset();
    save.clear();
    const home = map.sites.get('casa');
    if (home) player.placeAt(home.door.col, home.door.row, Math.PI / 4);
    turn.reset();
    this.persist();
    this.refreshTarget();
    await this.showMissionCard();
  }

  /** Porta da instituição da missão atual. */
  missionDoor(): Cell | null {
    const mission = this.d.manager.current;
    return mission ? (this.d.map.sites.get(mission.instituicao)?.door ?? null) : null;
  }

  private onArrive(cell: Cell): void {
    this.persist();
    this.checkDoor(cell);
  }

  /** Se o personagem parou na porta da missão, começa a visita; se parou em outra porta, avisa. */
  private checkDoor(cell: Cell | null): void {
    const { manager, map, content, diceHud } = this.d;
    const mission = manager.current;
    if (!mission || !cell || this.visiting) return;
    const door = this.missionDoor();
    if (door && sameCell(cell, door)) {
      void this.visit(mission);
      return;
    }
    for (const site of map.sites.values()) {
      if (!sameCell(cell, site.door)) continue;
      const here = content.institutions.get(site.id);
      const goal = content.institutions.get(mission.instituicao);
      if (here && goal) diceHud.say(TEXT.wrongDoor(here.nomeComPreposicao, goal.nomeComPreposicao));
      return;
    }
  }

  private async visit(mission: Mission): Promise<void> {
    const { content, manager, dialogue, map, player, uiRoot } = this.d;
    this.visiting = true;
    try {
      const inst = content.institutions.get(mission.instituicao);
      const dialog = content.dialogues.get(mission.dialogo);
      const question = content.questions.get(mission.pergunta);
      if (!inst || !dialog || !question) return;
      const style = INSTITUTION_STYLES[mission.instituicao];

      // De frente para o prédio durante a conversa.
      const site = map.sites.get(mission.instituicao);
      if (site) player.placeAt(site.door.col, site.door.row, faceYawFor(map, site));

      const { firstTry } = await dialogue.run(
        { nome: inst.personagem.nome, funcao: inst.personagem.funcao, color: style.color, icon: style.icon },
        dialog.falas,
        question,
      );

      const result = manager.complete(firstTry);
      this.persist();
      await showCard(uiRoot, {
        kicker: TEXT.pinKicker,
        title: inst.nome,
        text: mission.titulo,
        lines: firstTry ? [TEXT.firstTry] : [],
        icon: style.icon,
        color: style.color,
        button: TEXT.next,
      });

      if (result.finished) {
        this.refreshTarget();
        await showCard(uiRoot, {
          title: TEXT.endTitle,
          text: TEXT.endText(manager.completedCount, manager.total, manager.firstTryCount),
          button: TEXT.close,
        });
        return;
      }
      if (result.eixoChanged) {
        const eixo = manager.currentEixo;
        if (eixo) await showCard(uiRoot, { kicker: TEXT.eixoKicker, title: eixo.nome, text: eixo.descricao, button: TEXT.next });
      }
      this.refreshTarget();
      await this.showMissionCard();
    } finally {
      this.visiting = false;
    }
  }

  private async showMissionCard(): Promise<void> {
    const { manager, content, uiRoot } = this.d;
    const mission = manager.current;
    const eixo = manager.currentEixo;
    if (!mission || !eixo) return;
    const inst = content.institutions.get(mission.instituicao);
    const style = INSTITUTION_STYLES[mission.instituicao];
    await showCard(uiRoot, {
      kicker: TEXT.missionOf(manager.index + 1, manager.total, eixo.nome),
      title: mission.titulo,
      text: mission.descricao,
      lines: [TEXT.destination(inst?.nome ?? '')],
      icon: style.icon,
      color: style.color,
      button: TEXT.go,
    });
  }

  /** Atualiza marcador, seta da borda e o "Ir rumo ao objetivo" para a missão atual. */
  private refreshTarget(): void {
    const { manager, map, marker, markerAnchors, edgeArrow, diceHud } = this.d;
    const mission = manager.current;
    const site = mission ? map.sites.get(mission.instituicao) : undefined;
    const anchor = mission ? markerAnchors.get(mission.instituicao) : undefined;
    if (!mission || !site || !anchor) {
      marker.setTarget(null);
      edgeArrow.setTarget(null);
      diceHud.setGoTowards(null);
      return;
    }
    const style = INSTITUTION_STYLES[mission.instituicao];
    const door = map.tileCenter(site.door.col, site.door.row);
    marker.setTarget({ anchor, door, color: style.color });
    edgeArrow.setTarget({ position: anchor, color: style.color, icon: style.icon });
    diceHud.setGoTowards(() => this.goTowardsMission());
  }

  private goTowardsMission(): void {
    const { manager, map, turn } = this.d;
    const mission = manager.current;
    const site = mission ? map.sites.get(mission.instituicao) : undefined;
    if (site) turn.goTowards(site.door, faceYawFor(map, site));
  }

  private persist(): void {
    const { save, manager, player } = this.d;
    save.save(manager.toSave(player.cell));
  }
}
