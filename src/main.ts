import './style.css';
import { GAME_NAME } from './config';
import { IsoCamera } from './core/camera';
import { Input } from './core/input';
import { GameLoop } from './core/loop';
import { GameRenderer, isWebGLAvailable } from './core/renderer';
import { Character } from './player/character';
import { TapPicker } from './player/clickToMove';
import { Dice3D } from './player/dice';
import { DiceTurn } from './player/diceTurn';
import { Player } from './player/player';
import { ReachHighlight } from './player/reachHighlight';
import { DiceHud } from './ui/diceHud';
import { createCity } from './world/city';
import { createScene } from './world/scene';

function showWebGLError(): void {
  document.getElementById('webgl-error')?.removeAttribute('hidden');
}

function start(container: HTMLElement): void {
  const gameRenderer = new GameRenderer(container);
  const scene = createScene();
  const city = createCity(scene);
  const iso = new IsoCamera(city.map.halfSize);
  const input = new Input(gameRenderer.canvas);

  // Personagem começa na porta de casa, virado para a câmera.
  const player = new Player(city.map, new Character());
  scene.add(player.object);
  const home = city.map.sites.get('casa');
  if (home) player.placeAt(home.door.col, home.door.row, Math.PI / 4);
  iso.centerOn(player.position.x, player.position.z, player.position.y);
  iso.follow(player);

  // Movimento por dado: jogar → escolher casa destacada → andar.
  const dice = new Dice3D();
  const highlight = new ReachHighlight(city.map);
  scene.add(dice.mesh, highlight.mesh);
  const turn = new DiceTurn({
    map: city.map,
    player,
    dice,
    highlight,
    picker: new TapPicker({ map: city.map, camera: iso.camera, canvas: gameRenderer.canvas, pickRoot: city.root }),
  });
  // A cada jogada a câmera volta a seguir o personagem (WASD solta a câmera).
  turn.onChange((e) => {
    if (e.state === 'rolling' || e.state === 'walking') iso.follow(player);
  });
  input.onTap((x, y) => turn.handleTap(x, y));

  const hud = document.getElementById('hud');
  if (hud) new DiceHud(hud, turn);

  gameRenderer.onResize((width, height) => iso.resize(width, height));

  const loop = new GameLoop((dt) => {
    const pan = input.panAxis();
    iso.pan(pan.x, pan.y, dt);
    iso.zoomBy(input.consumeZoom());
    player.update(dt);
    dice.update(dt);
    highlight.update(dt);
    iso.update(dt);
    gameRenderer.renderer.render(scene, iso.camera);
  });
  loop.start();
}

document.title = GAME_NAME;

const container = document.getElementById('game');
if (!container || !isWebGLAvailable()) {
  showWebGLError();
} else {
  try {
    start(container);
  } catch (error) {
    console.error(error);
    showWebGLError();
  }
}
