import type { Vector3 } from 'three';
import type { GameSound } from '../audio/sound';
import type { SaveStore } from '../core/save';
import type { KitMinigame } from '../minigames/kitMinigame';
import { faceYawFor } from '../player/clickToMove';
import type { DiceTurn } from '../player/diceTurn';
import type { Pawns } from '../player/pawns';
import type { Cell } from '../player/pathfinding';
import type { TeamPlayer } from '../player/team';
import { showCard } from '../ui/cards';
import type { DialogueBox } from '../ui/dialogue';
import type { DiceHud } from '../ui/diceHud';
import type { EdgeArrow } from '../ui/edgeArrow';
import type { MissionHud } from '../ui/missionHud';
import type { CityMap } from '../world/cityMap';
import type { Climate } from '../world/climate';
import type { InstitutionId } from '../world/institutions';
import { INSTITUTION_STYLES } from '../world/institutions';
import type { MissionMarkers } from '../world/markers';
import type { EixoId, GameContent, Mission } from './content';
import type { MissionManager } from './missionManager';

/** Até quantas casas em volta procurar uma rua seca, se a água cobrir a casa de um peão. */
const DRY_SEARCH_RADIUS = 10;

/** No registro do que cada jogador já sabe: está ajudando a equipe (nos outros casos, o id da missão). */
const HELPING = 'ajudando';

// Textos da interface (não são conteúdo educativo).
const TEXT = {
  missionOf: (n: number, total: number, eixo: string) => `Missão ${n} de ${total} · ${eixo}`,
  // "de" serve para qualquer nome ("Missão de Ana"); sem nome, "Missão do Jogador 2".
  missionOfPlayer: (player: TeamPlayer, eixo: string) => `Missão ${player.typedName ? 'de' : 'do'} ${player.name} · ${eixo}`,
  destination: (name: string) => `Destino: ${name}`,
  go: 'Vamos lá',
  pinKicker: 'Pin conquistado',
  firstTry: 'Você acertou de primeira!',
  next: 'Continuar',
  eixoKicker: 'Novo eixo',
  wrongDoor: (here: string, goal: string) => `Você está ${here}. Sua missão agora é ${goal}.`,
  noMissionHere: (name: string, here: string) => `${name} está ${here}. Nenhuma missão em andamento aqui.`,
  helping: (name: string) => `${name} agora ajuda a equipe e pode fazer a missão de um colega.`,
} as const;

export interface MissionFlowDeps {
  content: GameContent;
  manager: MissionManager;
  save: SaveStore;
  map: CityMap;
  pawns: Pawns;
  turn: DiceTurn;
  markers: MissionMarkers;
  markerAnchors: ReadonlyMap<InstitutionId, Vector3>;
  climate: Climate;
  dialogue: DialogueBox;
  /** Minijogo da mochila (missões com "minijogo": "kit"). */
  kit: KitMinigame;
  diceHud: DiceHud;
  missionHud: MissionHud;
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
 * Cada jogador tem a sua missão, e quem para na porta de qualquer missão em andamento faz a visita.
 * Com 2 ou mais jogadores, a vez passa quando o peão chega e depois de cada visita.
 */
export class MissionFlow {
  private readonly d: MissionFlowDeps;
  private visiting = false;
  private begun = false;
  /** O que cada jogador já sabe: a missão do último cartão que viu, ou que está ajudando. */
  private told: string[] = [];

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
   * Começa (ou continua) o jogo: põe o clima do eixo e começa a vez de quem joga agora.
   * Só vale na primeira vez: voltar da tela inicial depois disso não repete nada.
   */
  async start(): Promise<void> {
    if (this.begun) return;
    this.begun = true;
    this.d.climate.set(this.climateEixo(), false);
    if (this.moveOutOfWater()) this.persist();
    const { pawns } = this.d;
    // Em equipe, todos começam em casa: o rodapé já abre dizendo de quem é a vez.
    await this.beginTurn(pawns.team.length > 1 ? null : this.wrongDoorNotice(pawns.active.cell));
  }

  /** Apaga o progresso e volta para a primeira missão, em casa. O jogo só começa no próximo start(). */
  reset(): void {
    const { manager, save, pawns, turn, climate } = this.d;
    this.begun = false;
    this.told = [];
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
    await this.beginTurn();
  }

  private onArrive(cell: Cell): void {
    if (this.visiting) return;
    this.persist();
    if (this.visitAtDoor(cell)) return;
    // O aviso fala de quem acabou de chegar, então é montado antes de a vez passar.
    const notice = this.wrongDoorNotice(cell);
    this.d.pawns.nextTurn();
    void this.beginTurn(notice);
  }

  /**
   * Começo da vez: mostra o cartão de quem recebeu uma missão nova, avisa quem passou a ajudar
   * e, se o peão já estiver na porta de uma missão em andamento, começa a visita sem jogar o dado.
   */
  private async beginTurn(notice: string | null = null): Promise<void> {
    const { manager, pawns, diceHud } = this.d;
    this.refreshTarget();
    const player = pawns.activeIndex;
    const mission = manager.missionOf(player);
    const situation = mission?.id ?? HELPING;
    const isNews = !manager.isFinished && this.told[player] !== situation;
    if (isNews) this.told[player] = situation;
    if (isNews && mission) await this.showMissionCard(mission);
    if (this.visitAtDoor(pawns.active.cell)) return;
    const helping = isNews && !mission ? TEXT.helping(pawns.activeMember.name) : null;
    const text = [notice, helping].filter((line) => line !== null).join(' ');
    if (text) diceHud.say(text);
  }

  /** Porta da instituição de uma missão. */
  private doorOf(mission: Mission): Cell | null {
    return this.d.map.sites.get(mission.instituicao)?.door ?? null;
  }

  /** Missão em andamento nesta porta: a do jogador da vez, se for uma delas; senão, a primeira de missions.json. */
  private missionAtDoor(cell: Cell | null): Mission | null {
    const { manager, pawns } = this.d;
    const here = manager.active.filter(({ mission }) => {
      const door = this.doorOf(mission);
      return !!door && sameCell(cell, door);
    });
    return (here.find(({ owner }) => owner === pawns.activeIndex) ?? here[0])?.mission ?? null;
  }

  /** Se o peão da vez está na porta de uma missão em andamento, começa a visita. */
  private visitAtDoor(cell: Cell | null): boolean {
    const mission = this.missionAtDoor(cell);
    if (!mission) return false;
    void this.visit(mission);
    return true;
  }

  /** Aviso para quem parou na porta de uma instituição sem missão em andamento (null nas outras casas). */
  private wrongDoorNotice(cell: Cell | null): string | null {
    const { manager, map, content, pawns } = this.d;
    if (manager.isFinished || this.missionAtDoor(cell)) return null;
    for (const site of map.sites.values()) {
      if (!sameCell(cell, site.door)) continue;
      const here = content.institutions.get(site.id);
      if (!here) return null;
      if (pawns.team.length > 1) return TEXT.noMissionHere(pawns.activeMember.name, here.nomeComPreposicao);
      const mission = manager.missionOf(pawns.activeIndex);
      const goal = mission && content.institutions.get(mission.instituicao);
      return goal ? TEXT.wrongDoor(here.nomeComPreposicao, goal.nomeComPreposicao) : null;
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

      const result = manager.complete(mission, firstTry, pawns.nextIndex);
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
      // A câmera já vai para o próximo atrás do cartão da missão.
      pawns.nextTurn();
      await this.beginTurn();
    } finally {
      this.visiting = false;
    }
  }

  /** Cartão da missão do jogador da vez. Em equipe, com o nome em cima. */
  private async showMissionCard(mission: Mission): Promise<void> {
    const { manager, content, pawns, uiRoot } = this.d;
    const eixo = manager.eixoOf(mission);
    const inst = content.institutions.get(mission.instituicao);
    const style = INSTITUTION_STYLES[mission.instituicao];
    await showCard(uiRoot, {
      kicker:
        pawns.team.length > 1
          ? TEXT.missionOfPlayer(pawns.activeMember, eixo.nome)
          : TEXT.missionOf(manager.positionOf(mission) + 1, manager.total, eixo.nome),
      title: mission.titulo,
      text: mission.descricao,
      lines: [TEXT.destination(inst?.nome ?? '')],
      icon: style.icon,
      color: style.color,
      button: TEXT.go,
    });
  }

  /** Para onde vai o jogador da vez: a própria missão ou, para quem ajuda, a missão em andamento mais perto. */
  private targetMission(): Mission | null {
    const { manager, turn, pawns } = this.d;
    const own = manager.missionOf(pawns.activeIndex);
    if (own) return own;
    let nearest: Mission | null = null;
    let nearestSteps = Infinity;
    for (const { mission } of manager.active) {
      const door = this.doorOf(mission);
      const steps = door ? turn.stepsTo(door) : Infinity;
      if (steps < nearestSteps) {
        nearest = mission;
        nearestSteps = steps;
      }
    }
    return nearest;
  }

  /** Atualiza as setas das missões, a barra do topo, a seta da borda e o "Ir rumo ao objetivo". */
  private refreshTarget(): void {
    const { manager, map, markers, markerAnchors, edgeArrow, diceHud, missionHud, pawns } = this.d;
    markers.setTargets(
      manager.active.flatMap(({ mission }) => {
        const door = this.doorOf(mission);
        const anchor = markerAnchors.get(mission.instituicao);
        if (!door || !anchor) return [];
        return [{ anchor, door: map.tileCenter(door.col, door.row), color: INSTITUTION_STYLES[mission.instituicao].color }];
      }),
    );

    const mission = this.targetMission();
    missionHud.setTurn(pawns.activeIndex, mission);
    const anchor = mission ? markerAnchors.get(mission.instituicao) : undefined;
    if (!mission || !anchor) {
      edgeArrow.setTarget(null);
      diceHud.setGoTowards(null);
      return;
    }
    const style = INSTITUTION_STYLES[mission.instituicao];
    edgeArrow.setTarget({ position: anchor, color: style.color, icon: style.icon });
    diceHud.setGoTowards(() => this.goTowardsMission());
  }

  private goTowardsMission(): void {
    const { map, turn } = this.d;
    const mission = this.targetMission();
    const site = mission ? map.sites.get(mission.instituicao) : undefined;
    if (site) turn.goTowards(site.door, faceYawFor(map, site));
  }

  /** Clima a mostrar: o do eixo atual; depois da última missão, fica o do último eixo. */
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
