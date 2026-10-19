import type { DiceTurn, TurnEvent, TurnHint } from '../player/diceTurn';

// Textos da interface do dado (não são conteúdo educativo).
const TEXT = {
  button: 'Jogar dado',
  goTowards: 'Ir rumo ao objetivo',
  waiting: 'Sua vez! Jogue o dado.',
  rolling: 'Rolando o dado…',
  choosing: (n: number) => `Você tirou ${n}. Escolha uma das casas destacadas.`,
  walking: 'Andando…',
  hints: {
    'pick-highlighted': 'Escolha uma das casas destacadas.',
    'door-too-far': 'Essa porta ainda está longe. Escolha uma das casas destacadas.',
    'nothing-in-reach': 'Nenhuma casa ao alcance. Jogue o dado de novo.',
    flooded: 'Essa rua está alagada. Escolha uma das casas destacadas.',
  } satisfies Record<TurnHint, string>,
} as const;

/** Desenho simples de dado (5 pintas) para o botão. */
const DIE_ICON = `<svg class="botao-dado__icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" opacity="0.18"/>
  <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="7.5" cy="7.5" r="1.7" fill="currentColor"/><circle cx="16.5" cy="7.5" r="1.7" fill="currentColor"/>
  <circle cx="12" cy="12" r="1.7" fill="currentColor"/>
  <circle cx="7.5" cy="16.5" r="1.7" fill="currentColor"/><circle cx="16.5" cy="16.5" r="1.7" fill="currentColor"/>
</svg>`;

/** Campos e botões tratam Enter/Espaço sozinhos; o atalho só vale fora deles. */
function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(target.tagName);
}

/**
 * Botão "Jogar dado" e a linha de aviso no rodapé.
 * O aviso usa role="status" para leitores de tela anunciarem o número tirado.
 */
export class DiceHud {
  private readonly panel: HTMLDivElement;
  private readonly button: HTMLButtonElement;
  private readonly goal: HTMLButtonElement;
  private readonly status: HTMLParagraphElement;
  private readonly turn: DiceTurn;
  private goTowards: (() => void) | null = null;

  constructor(container: HTMLElement, turn: DiceTurn) {
    this.turn = turn;

    this.panel = document.createElement('div');
    this.panel.className = 'hud-dado';

    this.status = document.createElement('p');
    this.status.className = 'hud-dado__aviso';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');

    // Para quem joga só com teclado: aparece ao receber foco (Tab) na hora de escolher a casa.
    this.goal = document.createElement('button');
    this.goal.type = 'button';
    this.goal.className = 'botao-objetivo';
    this.goal.textContent = TEXT.goTowards;
    this.goal.hidden = true;
    this.goal.addEventListener('click', () => this.goTowards?.());

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'botao-dado';
    this.button.innerHTML = `${DIE_ICON}<span>${TEXT.button}</span>`;
    this.button.addEventListener('click', () => turn.roll());

    this.panel.append(this.goal, this.status, this.button);
    container.append(this.panel);

    // Atalho: Enter ou Espaço jogam o dado quando o foco não está num botão ou campo.
    window.addEventListener('keydown', (event) => {
      if (event.code !== 'Space' && event.code !== 'Enter' && event.code !== 'NumpadEnter') return;
      if (event.repeat || isInteractive(event.target) || this.turn.state !== 'waiting' || this.turn.isPaused) return;
      event.preventDefault();
      this.turn.roll();
    });

    turn.onChange((e) => this.render(e));
    this.render({ state: turn.state, value: null, hint: null });
  }

  /** O rodapé inteiro (usado para a seta da borda não ficar por cima). */
  get element(): HTMLElement {
    return this.panel;
  }

  /** Esconde o rodapé do dado (ex.: enquanto há diálogo ou cartão aberto). */
  setVisible(visible: boolean): void {
    this.panel.hidden = !visible;
  }

  /** Mostra um aviso no lugar do texto da vez, até a próxima mudança da vez. */
  say(text: string): void {
    this.status.textContent = text;
  }

  /** Ação do botão "Ir rumo ao objetivo" (null = sem objetivo, botão some). */
  setGoTowards(action: (() => void) | null): void {
    this.goTowards = action;
    this.goal.hidden = !(action && this.turn.state === 'choosing');
  }

  private render(event: TurnEvent): void {
    this.button.disabled = event.state !== 'waiting';
    this.button.hidden = event.state === 'choosing';
    this.goal.hidden = !(this.goTowards && event.state === 'choosing');

    let text: string;
    if (event.hint) text = TEXT.hints[event.hint];
    else if (event.state === 'choosing' && event.value !== null) text = TEXT.choosing(event.value);
    else if (event.state === 'rolling') text = TEXT.rolling;
    else if (event.state === 'walking') text = TEXT.walking;
    else text = TEXT.waiting;
    this.status.textContent = text;
  }
}
