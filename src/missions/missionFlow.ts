import type { Object3D, Vector3 } from 'three';
import type { GameSound } from '../audio/sound';
import type { SaveStore } from '../core/save';
import type { Activities } from '../minigames/activities';
import { faceYawFor } from '../player/clickToMove';
import type { DiceTurn } from '../player/diceTurn';
import type { Pawns } from '../player/pawns';
import type { Cell } from '../player/pathfinding';
import type { TeamPlayer } from '../player/team';
import { showBanner, showCard } from '../ui/cards';
import type { DialogueBox } from '../ui/dialogue';
import type { DiceHud } from '../ui/diceHud';
import type { EdgeArrow } from '../ui/edgeArrow';
import type { MissionHud } from '../ui/missionHud';
import type { CityMap, Site } from '../world/cityMap';
import type { Climate } from '../world/climate';
import type { InstitutionId } from '../world/institutions';
import { INSTITUTION_STYLES } from '../world/institutions';
import type { PlaceId } from '../world/layout';
import type { MissionMarkers } from '../world/markers';
import { addressText } from '../world/streetSigns';
import { destinationOf, type EixoId, type GameContent, type Mission } from './content';
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
  address: (text: string) => `Endereço: ${text}`,
  go: 'Vamos lá',
  placeKicker: 'Conheça o local',
  pinKicker: 'Pin conquistado',
  firstTry: 'Você acertou de primeira!',
  teamFirstTry: 'Acerto de primeira da equipe!',
  foundBy: (name: string) => `Buscado por ${name}`,
  next: 'Continuar',
  bannerZoomIn: 'Ampliar',
  bannerZoomOut: 'Ver inteira',
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
  /** Ponto acima de cada lugar que não é instituição (o acidente). */
  placeAnchors: ReadonlyMap<PlaceId, Vector3>;
  /** O desenho de cada lugar: só aparece enquanto a missão dele está em andamento. */
  placeScenes: ReadonlyMap<PlaceId, Object3D>;
  climate: Climate;
  dialogue: DialogueBox;
  /** Abre a atividade das missões que têm "atividade" no lugar da pergunta. */
  activities: Activities;
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
 * O loop das missões: cartão da missão → jogar o dado até a porta → carta do local → diálogo →
 * pergunta ou atividade → pin → (troca de eixo) → próxima missão. Salva o progresso a cada passo.
 * A porta é a da instituição ou, se a missão tiver `local`, a do lugar (o acidente). Num `local`
 * com atividade, a atividade vem antes do diálogo: primeiro a ligação, depois quem chega para ajudar.
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

  /** true depois do primeiro start() (o jogo já saiu da tela inicial alguma vez desde o último reset()). */
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

  /**
   * Só para o modo de teste (npm run dev com ?teste): recomeça, conta as missões anteriores como
   * feitas (buscadas pelo Jogador 1), põe o clima do eixo e abre a visita direto na porta.
   */
  async testVisit(mission: Mission): Promise<void> {
    if (this.visiting) return;
    const { content, manager, map, pawns } = this.d;
    this.reset();
    for (const before of content.missions) {
      if (before === mission) break;
      manager.complete(before, false, 0);
    }
    this.begun = true;
    this.d.climate.set(this.climateEixo(), false);
    const site = map.siteFor(mission);
    if (site) pawns.active.placeAt(site.door.col, site.door.row, faceYawFor(map, site));
    this.moveOutOfWater();
    // Quem está na vez já "sabe" a própria missão: o cartão dela não aparece por cima da visita.
    this.told[pawns.activeIndex] = manager.missionOf(pawns.activeIndex)?.id ?? HELPING;
    this.refreshTarget();
    this.persist();
    await this.visit(mission);
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
    // Salva de quem é a vez: recarregar a página agora continua na vez dessa pessoa.
    this.persist();
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

  /** Porta da missão: a do `local`, se tiver, ou a da instituição. */
  private doorOf(mission: Mission): Cell | null {
    return this.d.map.siteFor(mission)?.door ?? null;
  }

  /** Ponto onde fica o marcador da missão: acima do `local`, se tiver, ou da placa da instituição. */
  private anchorOf(mission: Mission): Vector3 | undefined {
    const { placeAnchors, markerAnchors } = this.d;
    return mission.local ? placeAnchors.get(mission.local.id) : markerAnchors.get(mission.instituicao);
  }

  /** Endereço de um bloco do mapa ("Avenida dos Ipês, 461"), ou null se a porta não der para rua com nome. */
  private addressLine(site: Site | undefined): string | null {
    const address = site && this.d.map.addressOf(site);
    return address ? TEXT.address(addressText(this.d.content.streets, address)) : null;
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
      const goal = mission && destinationOf(content, mission);
      return goal ? TEXT.wrongDoor(here.nomeComPreposicao, goal.nomeComPreposicao) : null;
    }
    return null;
  }

  private async visit(mission: Mission): Promise<void> {
    const { content, manager, dialogue, activities, map, pawns, uiRoot } = this.d;
    this.visiting = true;
    try {
      const inst = content.institutions.get(mission.instituicao);
      const dialog = content.dialogues.get(mission.dialogo);
      // Cada missão tem pergunta ou atividade: a que falta fica null; undefined = id que não existe.
      const question = mission.pergunta !== undefined ? content.questions.get(mission.pergunta) : null;
      const activity = mission.atividade !== undefined ? content.activities.get(mission.atividade) : null;
      if (!inst || !dialog || question === undefined || activity === undefined) return;
      const style = INSTITUTION_STYLES[mission.instituicao];

      // De frente para o prédio (ou o lugar) durante a conversa.
      const site = map.siteFor(mission);
      if (site) pawns.active.placeAt(site.door.col, site.door.row, faceYawFor(map, site));

      // Se a missão tiver banner, ele abre a visita, logo ao chegar.
      if (mission.banner) {
        await showBanner(uiRoot, {
          kicker: inst.nome,
          title: mission.banner.titulo,
          url: mission.banner.url,
          alt: mission.banner.descricao,
          color: style.color,
          zoomIn: TEXT.bannerZoomIn,
          zoomOut: TEXT.bannerZoomOut,
          button: TEXT.next,
        });
      }

      // A carta do local vem em seguida: o que esse lugar faz pela cidade. Na porta da instituição,
      // com o endereço dela (fora dela, como no acidente, o endereço está nas placas da rua).
      const address = mission.local ? null : this.addressLine(site);
      await showCard(uiRoot, {
        kicker: TEXT.placeKicker,
        title: inst.nome,
        text: inst.carta,
        lines: address ? [address] : [],
        icon: style.icon,
        color: style.color,
        button: TEXT.next,
      });

      // Conversa (com a pergunta, se houver) e a atividade, se a missão tiver. Num `local`, a
      // atividade vem primeiro (a ligação) e a conversa depois (quem chega para ajudar).
      const theme = { color: style.color, icon: style.icon };
      const talk = (): ReturnType<DialogueBox['run']> =>
        dialogue.run(
          { nome: inst.personagem.nome, funcao: inst.personagem.funcao, color: style.color, icon: style.icon },
          dialog.falas,
          question,
        );
      let firstTry: boolean;
      if (activity && mission.local) {
        firstTry = (await activities.run(activity, theme)).firstTry;
        await talk();
      } else {
        const talked = await talk();
        firstTry = activity ? (await activities.run(activity, theme)).firstTry : talked.firstTry;
      }

      // O pin é da equipe e guarda quem fez a visita (que pode não ser o dono da missão).
      const visitor = pawns.activeMember;
      const result = manager.complete(mission, firstTry, pawns.activeIndex);
      this.persist();
      this.d.sound.pin();
      const inTeam = pawns.team.length > 1;
      const lines = inTeam
        ? [TEXT.foundBy(visitor.name), ...(firstTry ? [TEXT.teamFirstTry] : [])]
        : firstTry
          ? [TEXT.firstTry]
          : [];
      await showCard(uiRoot, {
        kicker: TEXT.pinKicker,
        title: inst.nome,
        text: mission.titulo,
        lines,
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
    const destination = destinationOf(content, mission);
    const style = INSTITUTION_STYLES[mission.instituicao];
    await showCard(uiRoot, {
      kicker:
        pawns.team.length > 1
          ? TEXT.missionOfPlayer(pawns.activeMember, eixo.nome)
          : TEXT.missionOf(manager.positionOf(mission) + 1, manager.total, eixo.nome),
      title: mission.titulo,
      text: mission.descricao,
      lines: [TEXT.destination(destination?.nome ?? '')],
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
    const { manager, map, markers, placeScenes, edgeArrow, diceHud, missionHud, pawns } = this.d;
    // O acidente só aparece enquanto a missão dele está em andamento.
    for (const [id, scene] of placeScenes) scene.visible = manager.active.some(({ mission }) => mission.local?.id === id);
    markers.setTargets(
      manager.active.flatMap(({ mission }) => {
        const door = this.doorOf(mission);
        const anchor = this.anchorOf(mission);
        if (!door || !anchor) return [];
        return [{ anchor, door: map.tileCenter(door.col, door.row), color: INSTITUTION_STYLES[mission.instituicao].color }];
      }),
    );

    const mission = this.targetMission();
    missionHud.setTurn(pawns.activeIndex, mission);
    const anchor = mission ? this.anchorOf(mission) : undefined;
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
    const site = mission ? map.siteFor(mission) : undefined;
    if (site) turn.goTowards(site.door, faceYawFor(map, site));
  }

  /** Clima a mostrar: o do eixo atual; depois da última missão, fica o do último eixo. */
  private climateEixo(): EixoId {
    const { manager, content } = this.d;
    return manager.currentEixo?.id ?? content.eixos[content.eixos.length - 1].id;
  }

  /**
   * Todo peão numa casa que a água cobriu vai para a rua seca mais perto. Evita ficar preso sem
   * casa nenhuma ao alcance do dado. A porta de casa não serve de saída: ela fica na beira-rio e
   * também alaga em "Durante".
   */
  private moveOutOfWater(): boolean {
    const { pawns, map, climate } = this.d;
    const isFlooded = (col: number, row: number): boolean => climate.isFlooded(col, row);
    let moved = false;
    for (const pawn of pawns.all) {
      const cell = pawn.cell;
      if (!cell || !climate.isFlooded(cell.col, cell.row)) continue;
      const { x, z } = pawn.position;
      // Primeiro procura perto; se não achar, no mapa inteiro.
      const dry =
        map.nearestWalkable(x, z, DRY_SEARCH_RADIUS, isFlooded) ??
        map.nearestWalkable(x, z, Math.max(map.cols, map.rows), isFlooded);
      if (!dry) continue;
      pawn.placeAt(dry.col, dry.row);
      moved = true;
    }
    return moved;
  }

  /** Salva a equipe: nomes, casa de cada peão, de quem é a vez, a missão de cada um e os pins. */
  private persist(): void {
    const { save, manager, pawns } = this.d;
    save.save(
      manager.toSave(
        pawns.team.map((player) => player.typedName),
        pawns.all.map((pawn) => pawn.cell),
        pawns.activeIndex,
      ),
    );
  }
}
