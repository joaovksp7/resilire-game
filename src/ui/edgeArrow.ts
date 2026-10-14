import { type Camera, Vector3 } from 'three';
import { cssColor, type IconId, iconSvg } from '../world/icons';

/** Distância mínima da seta até as bordas e até a interface (px). */
const MARGIN = { gap: 34, side: 36 } as const;

/** Elementos da interface que a seta não deve cobrir. */
export interface EdgeArrowAvoid {
  /** Barra no topo (a seta fica abaixo dela). */
  top: HTMLElement;
  /** Rodapé do dado (a seta fica acima dele). */
  bottom: HTMLElement;
}

/**
 * Seta na borda da tela que aponta para o destino da missão quando ele está fora da vista.
 * É só visual (aria-hidden): o destino também aparece escrito na barra da missão.
 */
export class EdgeArrow {
  private readonly el: HTMLDivElement;
  private readonly pointer: HTMLDivElement;
  private readonly icon: HTMLDivElement;
  private readonly camera: Camera;
  private readonly container: HTMLElement;
  private readonly avoid: EdgeArrowAvoid;
  private readonly projected = new Vector3();
  private target: Vector3 | null = null;
  private enabled = true;

  constructor(container: HTMLElement, camera: Camera, avoid: EdgeArrowAvoid) {
    this.container = container;
    this.camera = camera;
    this.avoid = avoid;
    this.el = document.createElement('div');
    this.el.className = 'seta-destino';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.hidden = true;
    this.pointer = document.createElement('div');
    this.pointer.className = 'seta-destino__ponta';
    this.icon = document.createElement('div');
    this.icon.className = 'seta-destino__icone';
    this.el.append(this.pointer, this.icon);
    container.append(this.el);
  }

  setTarget(target: { position: Vector3; color: number; icon: IconId } | null): void {
    this.target = target ? target.position.clone() : null;
    if (target) {
      this.el.style.setProperty('--cor-inst', cssColor(target.color));
      this.icon.innerHTML = iconSvg(target.icon);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Chamar a cada quadro, depois de atualizar a câmera. */
  update(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!this.target || !this.enabled || w === 0 || h === 0) {
      this.el.hidden = true;
      return;
    }
    const p = this.projected.copy(this.target).project(this.camera);
    const x = ((p.x + 1) / 2) * w;
    const y = ((1 - p.y) / 2) * h;

    // Área segura: abaixo da barra do topo e acima do rodapé do dado.
    const box = this.container.getBoundingClientRect();
    const topBar = this.avoid.top.getBoundingClientRect();
    const footer = this.avoid.bottom.getBoundingClientRect();
    const left = MARGIN.side;
    const right = w - MARGIN.side;
    const top = Math.min(topBar.height > 0 ? topBar.bottom - box.top + MARGIN.gap : MARGIN.gap, h / 3);
    const bottom = Math.max(footer.height > 0 ? footer.top - box.top - MARGIN.gap : h - MARGIN.gap, (h * 2) / 3);
    if (x >= left && x <= right && y >= top && y <= bottom) {
      this.el.hidden = true;
      return;
    }

    // Leva o ponto até a borda da área segura, na direção do destino.
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const dx = x - cx;
    const dy = y - cy;
    const scale = Math.min(
      dx !== 0 ? (right - cx) / Math.abs(dx) : Infinity,
      dy !== 0 ? (bottom - cy) / Math.abs(dy) : Infinity,
    );
    const ex = cx + dx * scale;
    const ey = cy + dy * scale;
    const angle = Math.atan2(dy, dx);

    this.el.hidden = false;
    this.el.style.transform = `translate(${ex}px, ${ey}px)`;
    this.pointer.style.transform = `rotate(${angle}rad)`;
  }
}
