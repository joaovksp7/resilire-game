import './style.css';
import { GameSound } from './audio/sound';
import { GAME_NAME } from './config';
import { IsoCamera } from './core/camera';
import { Input } from './core/input';
import { GameLoop } from './core/loop';
import { GameRenderer, isWebGLAvailable } from './core/renderer';
import { SaveStore } from './core/save';
import { ContentError, type GameContent, loadContent } from './missions/content';
import { MissionFlow } from './missions/missionFlow';
import { KitMinigame } from './minigames/kitMinigame';
import { MissionManager } from './missions/missionManager';
import { Character } from './player/character';
import { TapPicker } from './player/clickToMove';
import { Dice3D } from './player/dice';
import { DiceTurn } from './player/diceTurn';
import { Player } from './player/player';
import { ReachHighlight } from './player/reachHighlight';
import { modals } from './ui/cards';
import { DiceHud } from './ui/diceHud';
import { DialogueBox } from './ui/dialogue';
import { EdgeArrow } from './ui/edgeArrow';
import { EndScreen } from './ui/endScreen';
import { MissionHud } from './ui/missionHud';
import { PauseMenu } from './ui/pauseMenu';
import { TitleScreen, type TitleMode } from './ui/titleScreen';
import { createCity } from './world/city';
import { Climate, floodedDoorProblem } from './world/climate';
import { MissionMarker } from './world/markers';
import { Rain } from './world/rain';
import { createScene } from './world/scene';

function showWebGLError(): void {
  document.getElementById('webgl-error')?.removeAttribute('hidden');
}

/** Aviso para a equipe quando o conteúdo (content/*.json) tem erro. */
function showContentError(message: string): void {
  const box = document.createElement('div');
  box.className = 'aviso';
  box.setAttribute('role', 'alert');
  const title = document.createElement('p');
  title.textContent = 'O conteúdo do jogo tem um erro e precisa ser corrigido:';
  const detail = document.createElement('p');
  detail.className = 'aviso__detalhe';
  detail.textContent = message;
  const hint = document.createElement('p');
  hint.textContent = 'Corrija o arquivo indicado e gere o build de novo.';
  box.append(title, detail, hint);
  document.getElementById('app')?.append(box);
}

function start(container: HTMLElement, hudRoot: HTMLElement, content: GameContent): void {
  const { scene, lights } = createScene();
  const city = createCity(scene);

  // Missão do eixo "Durante o evento" numa porta alagada deixaria o jogador sem caminho.
  const floodProblem = floodedDoorProblem(city.map, content);
  if (floodProblem) {
    console.error(new ContentError(floodProblem));
    showContentError(floodProblem);
    return;
  }

  const gameRenderer = new GameRenderer(container);

  // Progresso salvo (ou só em memória, se o navegador bloquear o armazenamento).
  const save = new SaveStore();
  const saved = save.load();
  const manager = new MissionManager(content, saved);

  // Clima por eixo: céu, luzes, rio, chuva e ruas alagadas. Já começa no eixo salvo,
  // para a tela inicial mostrar a cidade como o jogador deixou (MissionFlow.start() confirma).
  const rain = new Rain();
  scene.add(rain.mesh);
  const initialEixo = manager.currentEixo?.id ?? content.eixos[content.eixos.length - 1].id;
  const climate = new Climate({ scene, lights, water: city.water, rain, map: city.map }, initialEixo);

  // Som: chuva e efeitos. Só começa no primeiro clique, toque ou tecla (regra dos navegadores).
  const sound = new GameSound();
  // Tecla M liga e desliga o som em qualquer tela.
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyM' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    sound.toggle();
  });

  const iso = new IsoCamera(city.map.halfSize);
  const input = new Input(gameRenderer.canvas);

  // Personagem: volta para a casa salva; senão começa na porta de casa, virado para a câmera.
  const player = new Player(city.map, new Character());
  scene.add(player.object);
  const home = city.map.sites.get('casa');
  const savedCell = saved?.player;
  if (savedCell && city.map.tile(savedCell.col, savedCell.row)?.walkable) player.placeAt(savedCell.col, savedCell.row, Math.PI / 4);
  else if (home) player.placeAt(home.door.col, home.door.row, Math.PI / 4);
  iso.centerOn(player.position.x, player.position.z, player.position.y);
  iso.follow(player);

  // Movimento por dado: jogar → escolher casa destacada → andar.
  const dice = new Dice3D();
  const highlight = new ReachHighlight(city.map);
  const marker = new MissionMarker();
  scene.add(dice.mesh, highlight.mesh, marker.object);
  const turn = new DiceTurn({
    map: city.map,
    player,
    dice,
    highlight,
    picker: new TapPicker({ map: city.map, camera: iso.camera, canvas: gameRenderer.canvas, pickRoot: city.root }),
    // Ruas alagadas não entram nas casas destacadas: o caminho tem que ser pela parte alta.
    isBlocked: (col, row) => climate.isFlooded(col, row),
    // A porta da missão aparece em amarelo entre as casas destacadas.
    isSpecial: (cell) => {
      const mission = manager.current;
      const door = mission ? city.map.sites.get(mission.instituicao)?.door : undefined;
      return !!door && door.col === cell.col && door.row === cell.row;
    },
  });
  // A cada jogada a câmera volta a seguir o personagem (WASD solta a câmera).
  turn.onChange((e) => {
    if (e.state === 'rolling' || e.state === 'walking') iso.follow(player);
  });
  // Som do dado: batidinhas ao jogar e uma batida quando ele para no chão.
  let lastTurnState = turn.state;
  turn.onChange((e) => {
    if (e.state === 'rolling' && lastTurnState !== 'rolling') sound.diceShake();
    else if (lastTurnState === 'rolling' && (e.state === 'choosing' || e.hint === 'nothing-in-reach')) sound.diceLand();
    lastTurnState = e.state;
  });
  input.onTap((x, y) => turn.handleTap(x, y));

  // Interface.
  const diceHud = new DiceHud(hudRoot, turn);
  const missionHud = new MissionHud(hudRoot, content, manager, sound);
  const edgeArrow = new EdgeArrow(hudRoot, iso.camera, { top: missionHud.element, bottom: diceHud.element });
  const dialogue = new DialogueBox(hudRoot, () => sound.right());
  const endScreen = new EndScreen(hudRoot, content, manager);
  const eixoNames = content.eixos.map((e) => e.nome);

  // Com diálogo, cartão ou painel aberto, o jogo fica parado.
  modals.onChange((open) => {
    input.enabled = !open;
    turn.setPaused(open);
    diceHud.setVisible(!open);
    edgeArrow.setEnabled(!open);
  });

  /** Tela final. "Jogar de novo" apaga o progresso e volta para a primeira missão. */
  const showEnd = async (): Promise<void> => {
    if ((await endScreen.open()) === 'jogar-de-novo') await flow.restart();
  };

  const flow = new MissionFlow({
    content,
    manager,
    save,
    map: city.map,
    player,
    turn,
    marker,
    markerAnchors: city.markerAnchors,
    climate,
    dialogue,
    kit: new KitMinigame(hudRoot, content.kit, () => sound.right()),
    diceHud,
    edgeArrow,
    sound,
    uiRoot: hudRoot,
    showEnd,
  });

  // Tela inicial e pausa. Enquanto estão abertas, o personagem e o dado ficam parados.
  const title = new TitleScreen(hudRoot, {
    credits: content.credits,
    eixoNames,
    persistent: save.persistent,
    sound,
    play: () => void flow.start(),
    restart: () => void flow.restart(),
    showResult: () => {
      void flow.start();
      void showEnd();
    },
    onToggle: (open) => missionHud.setVisible(!open),
  });
  const openTitle = (): void => {
    const mode: TitleMode = !manager.current ? 'fim' : flow.started || saved !== null ? 'continuar' : 'novo';
    title.open({ mode, pins: manager.completedCount, total: manager.total });
  };
  const pause = new PauseMenu(hudRoot, missionHud.element, {
    eixoNames,
    sound,
    isFinished: () => !manager.current,
    showResult: () => void showEnd(),
    restart: () => void flow.restart(),
    goToTitle: openTitle,
  });

  gameRenderer.onResize((width, height) => iso.resize(width, height));

  const loop = new GameLoop((dt) => {
    const pan = input.panAxis();
    iso.pan(pan.x, pan.y, dt);
    iso.zoomBy(input.consumeZoom());
    // Na tela inicial e na pausa, o jogo para; a chuva e o rio continuam.
    if (!title.isOpen && !pause.isOpen) {
      player.update(dt);
      dice.update(dt);
    }
    highlight.update(dt);
    marker.update(dt);
    climate.update(dt);
    iso.update(dt);
    rain.update(dt, iso.focus, iso.camera);
    sound.setRain(rain.intensity);
    edgeArrow.update();
    gameRenderer.renderer.render(scene, iso.camera);
  });
  loop.start();
  openTitle();
}

document.title = GAME_NAME;

const container = document.getElementById('game');
const hudRoot = document.getElementById('hud');
let content: GameContent | null = null;
try {
  content = loadContent();
} catch (error) {
  console.error(error);
  showContentError(error instanceof ContentError ? error.message : String(error));
}

if (content && container && hudRoot) {
  if (!isWebGLAvailable()) {
    showWebGLError();
  } else {
    try {
      start(container, hudRoot, content);
    } catch (error) {
      console.error(error);
      showWebGLError();
    }
  }
}
