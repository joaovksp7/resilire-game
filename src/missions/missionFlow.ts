import type { Vector3 } from 'three';
import type { GameSound } from '../audio/sound';
import type { SaveStore } from '../core/save';
import type { KitMinigame } from '../minigames/kitMinigame';
import { faceYawFor } from '../player/clickToMove';
import type { DiceTurn } from '../player/diceTurn';
import type { Pawns } from '../player/pawns';
import type { Cell } from '../player/pathfinding';
import { showCard } from '../ui/cards';
import type { DialogueBox } from '../ui/dialogue';
import type { DiceHud } from '../ui/diceHud';
import type { EdgeArrow } from '../ui/edgeArrow';
import type { CityMap } from '../world/cityMap';
import type { Climate } from '../world/climate';
import type { InstitutionId } from '../world/institutions';
import { INSTITUTION_STYLES } from '../world/institutions';
import type { MissionMarker } from '../world/markers';
import type { EixoId, GameContent, Mission } from './content';
import type { MissionManager } from './missionManager';

/** Até quantas casas em volta procurar uma rua seca, se a água cobrir a casa de um peão. */
const DRY_SEARCH_RADIUS = 10;

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
  wrongDoorOf: (name: string, here: string, goal: string) => `${name} está ${here}. A missão agora é ${goal}.`,
} as const;

export interface MissionFlowDeps {
  content: GameContent;
  manager: MissionManager;
  save: SaveStore;
  map: CityMap;
  pawns: Pawns;
  turn: DiceTurn;
  marker: MissionMarker;
  markerAnchors: ReadonlyMap<InstitutionId, Vector3>;
  climate: Climate;
  dialogue: DialogueBox;
  /** Minijogo da mochila (missões com "minijogo": "kit"). */
  kit: KitMinigame;
  diceHud: DiceHud;
  edgeArrow: EdgeArrow;
  /** Som do pin conquistado. */
  sound: GameSound;
  /** Onde ficam os cartões. */
  uiRoot: HTMLElement;
  /** Mostra a tela final (depois da última missão). Resolve quando ela fecha. */
  showEnd: () => Promise<void>;
}

const sameCell = (a: Cell | null, b: Cell): boolean => !!a && a.col === b.col && a.row === b.row;

/**
 * O loop das missões: cartão da missão → jogar o dado até a porta → diálogo → pergunta →
 * pin → (troca de eixo) → próxima missão. Salva o progresso a cada passo.
 * Com 2 ou mais jogadores, a vez passa quando o peão chega e depois de cada visita.
 */
export class MissionFlow {
  private readonly d: MissionFlowDeps;
  private visiting = false;
  private begun = false;

  constructor(deps: MissionFlowDeps) {
    this.d = deps;
    deps.pawns.onArrive((cell) => this.onArrive(cell));
    deps.diceHud.setGoTowards(() => this.goTowardsMission());
  }

  /** true depois do primeiro start() ou restart() (o jogo já saiu da tela inicial alguma vez). */
  get started(): boolean {
    return this.begun;
  }

  /**
   * Começa (ou continua) o jogo: põe o clima do eixo, mostra a missão atual e confere se já está na porta.
   * Só vale na primeira vez: voltar da tela inicial depois disso não repete nada.
   */
  async start(): Promise<void> {
    if (this.begun) return;
    this.begun = true;
    this.d.climate.set(this.climateEixo(), false);
    if (this.moveOutOfWater()) this.persist();
    this.refreshTarget();
    if (!this.d.manager.current) return;
    await this.showMissionCard();
    const { pawns, diceHud } = this.d;
    const cell = pawns.active.cell;
    if (this.visitAtDoor(cell)) return;
    // Em equipe, todos começam em casa: o rodapé já abre dizendo de quem é a vez.
    const notice = pawns.team.length > 1 ? null : this.wrongDoorNotice(cell);
    if (notice) diceHud.say(notice);
  }

  /** Apaga o progresso e volta para a primeira missão, em casa. O jogo só começa no próximo start(). */
  reset(): void {
    const { manager, save, pawns, turn, climate } = this.d;
    this.begun = false;
    manager.reset();
    save.clear();
    climate.set(this.climateEixo(), false);
    pawns.goHome();
    turn.reset();
    this.refreshTarget();
  }

  /** Apaga o progresso e já começa de novo, na primeira missão. */
  async restart(): Promise<void> {
    this.reset();
    this.begun = true;
    this.persist();
    await this.showMissionCard();
  }

  /** Porta da instituição da missão atual. */
  missionDoor(): Cell | null {
    const mission = this.d.manager.current;
    return mission ? (this.d.map.sites.get(mission.instituicao)?.door ?? null) : null;
  }

  private onArrive(cell: Cell): void {
    if (this.visiting) return;
    this.persist();
    if (this.visitAtDoor(cell)) return;
    // O aviso fala de quem acabou de chegar, então é montado antes de a vez passar.
    const notice = this.wrongDoorNotice(cell);
    this.d.pawns.nextTurn();
    if (notice) this.d.diceHud.say(notice);
  }

  /** Se o peão da vez está na porta da missão, começa a visita. */
  private visitAtDoor(cell: Cell | null): boolean {
    const mission = this.d.manager.current;
    const door = this.missionDoor();
    if (!mission || !door || !sameCell(cell, door)) return false;
    void this.visit(mission);
    return true;
  }

  /** Aviso para quem parou na porta de uma instituição que não é a da missão (null nas outras casas). */
  private wrongDoorNotice(cell: Cell | null): string | null {
    const { manager, map, content, pawns } = this.d;
    const mission = manager.current;
    if (!mission) return null;
    for (const site of map.sites.values()) {
      if (!sameCell(cell, site.door)) continue;
      const here = content.institutions.get(site.id);
      const goal = content.institutions.get(mission.instituicao);
      if (!here || !goal) return null;
      return pawns.team.length > 1
        ? TEXT.wrongDoorOf(pawns.activeMember.name, here.nomeComPreposicao, goal.nomeComPreposicao)
        : TEXT.wrongDoor(here.nomeComPreposicao, goal.nomeComPreposicao);
    }
    return null;
  }

  private async visit(mission: Mission): Promise<void> {
    const { content, manager, dialogue, kit, map, pawns, uiRoot } = this.d;
    this.visiting = true;
    try {
      const inst = content.institutions.get(mission.instituicao);
      const dialog = content.dialogues.get(mission.dialogo);
      // Missão com minijogo não tem pergunta (null); undefined = id que não existe.
      const question = mission.pergunta !== undefined ? content.questions.get(mission.pergunta) : null;
      if (!inst || !dialog || question === undefined) return;
      const style = INSTITUTION_STYLES[mission.instituicao];

      // De frente para o prédio durante a conversa.
      const site = map.sites.get(mission.instituicao);
      if (site) pawns.active.placeAt(site.door.col, site.door.row, faceYawFor(map, site));

      // Conversa (com a pergunta, se houver) e, depois, o minijogo, se a missão tiver.
      const talk = await dialogue.run(
        { nome: inst.personagem.nome, funcao: inst.personagem.funcao, color: style.color, icon: style.icon },
        dialog.falas,
        question,
      );
      const firstTry =
        mission.minijogo === 'kit' ? (await kit.run({ color: style.color, icon: style.icon })).firstTry : talk.firstTry;

      const result = manager.complete(firstTry);
      this.persist();
      this.d.sound.pin();
      await showCard(uiRoot, {
        kicker: TEXT.pinKicker,
        title: inst.nome,
        text: mission.titulo,
        lines: firstTry ? [TEXT.firstTry] : [],
        icon: style.icon,
        color: style.color,
        button: TEXT.next,
        celebrate: true,
      });

      if (result.finished) {
        this.refreshTarget();
        await this.d.showEnd();
        return;
      }
      if (result.eixoChanged) {
        const eixo = manager.currentEixo;
        if (eixo) {
          // O clima piora aos poucos atrás do cartão do novo eixo.
          this.d.climate.set(eixo.id, true);
          if (this.moveOutOfWater()) this.persist();
          await showCard(uiRoot, { kicker: TEXT.eixoKicker, title: eixo.nome, text: eixo.descricao, button: TEXT.next });
        }
      }
      this.refreshTarget();
      // A câmera já vai para o próximo atrás do cartão da missão.
      pawns.nextTurn();
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

  /** Clima a mostrar: o do eixo da missão atual; depois da última missão, fica o do último eixo. */
  private climateEixo(): EixoId {
    const { manager, content } = this.d;
    return manager.currentEixo?.id ?? content.eixos[content.eixos.length - 1].id;
  }

  /**
   * Todo peão numa casa que a água cobriu vai para a rua seca mais perto
   * (ou para a porta de casa). Evita ficar preso sem casa nenhuma ao alcance do dado.
   */
  private moveOutOfWater(): boolean {
    const { pawns, map, climate } = this.d;
    let moved = false;
    for (const pawn of pawns.all) {
      const cell = pawn.cell;
      if (!cell || !climate.isFlooded(cell.col, cell.row)) continue;
      const { x, z } = pawn.position;
      const dry =
        map.nearestWalkable(x, z, DRY_SEARCH_RADIUS, (col, row) => climate.isFlooded(col, row)) ??
        map.sites.get('casa')?.door ??
        null;
      if (!dry) continue;
      pawn.placeAt(dry.col, dry.row);
      moved = true;
    }
    return moved;
  }

  /** O save ainda guarda uma casa só, a do Jogador 1 (o da equipe chega na Fase 13). */
  private persist(): void {
    const { save, manager, pawns } = this.d;
    save.save(manager.toSave(pawns.first.cell));
  }
}
