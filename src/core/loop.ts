export type UpdateFn = (dt: number) => void;

/** Maior passo de tempo aceito por quadro, para evitar saltos depois de travadas. */
const MAX_DT = 0.1;

/**
 * Loop principal com requestAnimationFrame.
 * Para quando a aba fica escondida e retoma sem "pular" o tempo perdido.
 */
export class GameLoop {
  private readonly update: UpdateFn;
  private frameId = 0;
  private lastTime = 0;
  private running = false;

  constructor(update: UpdateFn) {
    this.update = update;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else this.start();
    });
  }

  start(): void {
    if (this.running || document.hidden) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  pause(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(Math.max(0, (now - this.lastTime) / 1000), MAX_DT);
    this.lastTime = now;
    this.update(dt);
    this.frameId = requestAnimationFrame(this.tick);
  };
}
