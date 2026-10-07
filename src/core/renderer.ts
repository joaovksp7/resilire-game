import { WebGLRenderer } from 'three';
import { RENDER } from '../config';

export type ResizeListener = (width: number, height: number) => void;

/** Testa se o navegador consegue criar um contexto WebGL. */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Cria o WebGLRenderer dentro do contêiner e mantém o tamanho em dia.
 * Usa ResizeObserver no contêiner (e não só window.resize) para funcionar
 * bem dentro de iframe e com a barra de endereço do celular aparecendo/sumindo.
 */
export class GameRenderer {
  readonly renderer: WebGLRenderer;
  private readonly container: HTMLElement;
  private readonly listeners: ResizeListener[] = [];
  private readonly observer: ResizeObserver;
  width = 1;
  height = 1;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new WebGLRenderer({
      antialias: window.devicePixelRatio < 2,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(RENDER.skyColor);
    this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  onResize(listener: ResizeListener): void {
    this.listeners.push(listener);
    listener(this.width, this.height);
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio);

    if (width === this.width && height === this.height && pixelRatio === this.renderer.getPixelRatio()) {
      return;
    }

    this.width = width;
    this.height = height;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    for (const listener of this.listeners) listener(width, height);
  }
}
