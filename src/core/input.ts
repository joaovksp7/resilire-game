import { CAMERA } from '../config';

const PAN_KEYS: Record<string, [x: number, y: number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

/** Converte o deltaY da roda para pixels, independente do deltaMode do navegador. */
function wheelPixels(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

/** Campos de texto não devem mover a câmera enquanto a pessoa digita. */
function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Junta as entradas de câmera: WASD/setas (pan), roda do mouse e pinça (zoom).
 * Usa event.code, então WASD funciona igual em teclado ABNT2 e outros layouts.
 */
export class Input {
  /** Quando false, ignora teclado e zoom (ex.: com diálogo aberto). */
  enabled = true;

  private readonly pressed = new Set<string>();
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;
  private zoomFactor = 1;

  constructor(surface: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.pressed.clear());

    surface.addEventListener('wheel', this.onWheel, { passive: false });
    surface.addEventListener('pointerdown', this.onPointerDown);
    surface.addEventListener('pointermove', this.onPointerMove);
    surface.addEventListener('pointerup', this.onPointerEnd);
    surface.addEventListener('pointercancel', this.onPointerEnd);
  }

  /** Direção de pan em coordenadas de tela, normalizada (x = direita, y = cima). */
  panAxis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.enabled) {
      for (const code of this.pressed) {
        const dir = PAN_KEYS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
    }
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  /** Zoom acumulado desde a última chamada (1 = sem mudança). */
  consumeZoom(): number {
    const factor = this.zoomFactor;
    this.zoomFactor = 1;
    return factor;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled || event.altKey || event.ctrlKey || event.metaKey) return;
    if (isTextField(event.target)) return;
    if (!(event.code in PAN_KEYS)) return;
    // Evita que as setas rolem a página que contém o iframe.
    event.preventDefault();
    this.pressed.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private readonly onWheel = (event: WheelEvent): void => {
    // Impede rolar a página/zoom do navegador quando o mouse está sobre o jogo.
    event.preventDefault();
    if (!this.enabled) return;
    this.zoomFactor *= Math.exp((-wheelPixels(event) / 100) * CAMERA.wheelZoomStep);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) this.pinchDistance = this.currentPinchDistance();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    if (this.pointers.size === 2 && this.pinchDistance > 0) {
      const distance = this.currentPinchDistance();
      if (this.enabled && distance > 0) this.zoomFactor *= distance / this.pinchDistance;
      this.pinchDistance = distance;
    }
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    this.pinchDistance = this.pointers.size === 2 ? this.currentPinchDistance() : 0;
  };

  private currentPinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
}
