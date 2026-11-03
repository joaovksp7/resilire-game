import type { DiceTurn, TurnEvent, TurnHint } from '../player/diceTurn';
import type { Pawns } from '../player/pawns';
import type { TeamPlayer } from '../player/team';
import { cssColor } from '../world/icons';

// Textos da interface do dado (não são conteúdo educativo).
const TEXT = {
  button: 'Jogar dado',
  goTowards: 'Ir rumo ao objetivo',
  waiting: 'Sua vez! Jogue o dado.',
  // Com nome digitado, "Vez de Ana"; sem nome, "Vez do Jogador 2".
  turnOf: (player: TeamPlayer) => `Vez ${player.typedName ? 'de' : 'do'} ${player.name}`,
  waitingOf: (turn: string) => `${turn}! Jogue o dado.`,
  rolling: 'Rolando o dado…',
  choosing: (n: number) => `Você tirou ${n}. Escolha uma das casas destacadas.`,
  choosingOf: (name: string, n: number) => `${name} tirou ${n}. Escolha uma das casas destacadas.`,
  walking: 'Andando…',
  nothingInReachOf: (name: string) => `Nenhuma casa ao alcance. ${name}, jogue o dado de novo.`,
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
 * Com 2 ou mais jogadores, ele diz de quem é a vez, com o número e a cor do peão.
 */
export class DiceHud {
  private readonly panel: HTMLDivElement;
  private readonly button: HTMLButtonElement;
  private readonly goal: HTMLButtonElement;
  private readonly status: HTMLParagraphElement;
  /** Selo com o número e a cor do jogador da vez: a cor nunca é a única pista. */
  private readonly pawnBadge: HTMLSpanElement;
  private readonly turn: DiceTurn;
  private readonly pawns: Pawns;
  private goTowards: (() => void) | null = null;

  constructor(container: HTMLElement, turn: DiceTurn, pawns: Pawns) {
    this.turn = turn;
    this.pawns = pawns;

    this.panel = document.createElement('div');
    this.panel.className = 'hud-dado';

    this.status = document.createElement('p');
    this.status.className = 'hud-dado__aviso';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');

    this.pawnBadge = document.createElement('span');
    this.pawnBadge.className = 'hud-dado__peao';
    this.pawnBadge.setAttribute('aria-hidden', 'true');

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
    const renderNow = (): void => this.render({ state: turn.state, value: null, hint: null });
    pawns.onTurnChange(renderNow);
    renderNow();
  }

  private get isTeam(): boolean {
    return this.pawns.team.length > 1;
  }

  /** O rodapé inteiro (usado para a seta da borda não ficar por cima). */
  get element(): HTMLElement {
    return this.panel;
  }

  /** Esconde o rodapé do dado (ex.: enquanto há diálogo ou cartão aberto). */
  setVisible(visible: boolean): void {
    this.panel.hidden = !visible;
  }

  /**
   * Mostra um aviso até a próxima mudança da vez. Em equipe, a vez já pode ter passado para outra
   * pessoa, então o aviso vem seguido de quem joga agora.
   */
  say(text: string): void {
    this.show(this.isTeam ? `${text} ${TEXT.turnOf(this.pawns.activeMember)}.` : text);
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
    this.show(this.textFor(event));
  }

  private textFor(event: TurnEvent): string {
    const player = this.pawns.activeMember;
    if (this.isTeam && event.hint === 'nothing-in-reach') return TEXT.nothingInReachOf(player.name);
    if (event.hint) return TEXT.hints[event.hint];
    if (event.state === 'choosing' && event.value !== null) {
      return this.isTeam ? TEXT.choosingOf(player.name, event.value) : TEXT.choosing(event.value);
    }
    if (event.state === 'rolling') return TEXT.rolling;
    if (event.state === 'walking') return TEXT.walking;
    return this.isTeam ? TEXT.waitingOf(TEXT.turnOf(player)) : TEXT.waiting;
  }

  private show(text: string): void {
    this.status.classList.toggle('hud-dado__aviso--vez', this.isTeam);
    if (!this.isTeam) {
      this.status.textContent = text;
      return;
    }
    const player = this.pawns.activeMember;
    this.status.style.setProperty('--cor-peao', cssColor(player.color));
    this.pawnBadge.textContent = String(player.number);
    this.status.replaceChildren(this.pawnBadge, document.createTextNode(text));
  }
}
