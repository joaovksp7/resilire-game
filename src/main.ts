import './style.css';
import { GAME_NAME, WORLD } from './config';
import { IsoCamera } from './core/camera';
import { Input } from './core/input';
import { GameLoop } from './core/loop';
import { GameRenderer, isWebGLAvailable } from './core/renderer';
import { createScene } from './world/scene';

function showWebGLError(): void {
  document.getElementById('webgl-error')?.removeAttribute('hidden');
}

function start(container: HTMLElement): void {
  const gameRenderer = new GameRenderer(container);
  const scene = createScene();
  const iso = new IsoCamera(WORLD.groundSize / 2);
  const input = new Input(gameRenderer.canvas);

  gameRenderer.onResize((width, height) => iso.resize(width, height));

  const loop = new GameLoop((dt) => {
    const pan = input.panAxis();
    iso.pan(pan.x, pan.y, dt);
    iso.zoomBy(input.consumeZoom());
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
