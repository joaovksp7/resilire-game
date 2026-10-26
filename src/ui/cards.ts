import { cssColor, type IconId, iconSvg } from '../world/icons';

// Janelas sobre o jogo (cartões, diálogo, painel de pins).
// Enquanto alguma estiver aberta, o jogo fica travado (ver `modals.onChange`).

const FOCUSABLE = 'button:not([disabled]):not([hidden]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

type ModalListener = (open: boolean) => void;
const modalListeners: ModalListener[] = [];
let openCount = 0;
let idCounter = 0;

/** Contagem de janelas abertas: o jogo usa para travar entrada, dado e setas. */
export const modals = {
  get isOpen(): boolean {
    return openCount > 0;
  },
  onChange(listener: ModalListener): void {
    modalListeners.push(listener);
  },
};

function setOpenCount(n: number): void {
  const was = openCount > 0;
  openCount = n;
  if (was !== openCount > 0) for (const l of modalListeners) l(openCount > 0);
}

/** Gera um id único para ligar títulos a aria-labelledby. */
export function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export interface ModalHandle {
  readonly element: HTMLElement;
  close(): void;
  /** Põe o foco no primeiro elemento marcado com data-autofocus (ou no primeiro botão). */
  focusFirst(): void;
}

export interface ModalOptions {
  /** id do título da janela (aria-labelledby). */
  labelledBy: string;
  /**
   * 'card' e 'panel' ficam no centro com fundo escurecido; 'dialogue' fica no rodapé;
   * 'tela' cobre a tela toda com um fundo mais forte (tela inicial e tela final).
   */
  variant: 'card' | 'panel' | 'dialogue' | 'tela';
  /** Chamado com Esc. Sem isso, Esc não fecha. */
  onEscape?: () => void;
}

/**
 * Abre uma janela modal: foco vai para dentro, Tab fica preso nela,
 * e ao fechar o foco volta para onde estava.
 */
export function openModal(root: HTMLElement, content: HTMLElement, opts: ModalOptions): ModalHandle {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const wrapper = document.createElement('div');
  wrapper.className = `modal modal--${opts.variant}`;
  wrapper.setAttribute('role', 'dialog');
  wrapper.setAttribute('aria-modal', 'true');
  wrapper.setAttribute('aria-labelledby', opts.labelledBy);
  wrapper.append(content);
  root.append(wrapper);
  setOpenCount(openCount + 1);

  const focusables = (): HTMLElement[] =>
    [...wrapper.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);

  const focusFirst = (): void => {
    const target = wrapper.querySelector<HTMLElement>('[data-autofocus]:not([disabled]):not([hidden])') ?? focusables()[0];
    target?.focus();
  };

  wrapper.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && opts.onEscape) {
      event.preventDefault();
      opts.onEscape();
      return;
    }
    if (event.key !== 'Tab') return;
    const list = focusables();
    if (list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    // Foco fora da lista (ex.: no título de uma tela longa, com tabindex="-1") conta como o começo.
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && index <= 0) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    wrapper.remove();
    setOpenCount(openCount - 1);
    if (previous && previous.isConnected) previous.focus();
  };

  focusFirst();
  return { element: wrapper, close, focusFirst };
}

export interface CardOptions {
  /** Linha pequena acima do título (ex.: "Missão 1 de 10 · Alerta"). */
  kicker?: string;
  title: string;
  text?: string;
  /** Linhas extras, cada uma num parágrafo (ex.: "Destino: Defesa Civil"). */
  lines?: readonly string[];
  icon?: IconId;
  color?: number;
  button: string;
  /** Cartão do pin: o selo entra com um pulo e um brilho (parado com prefers-reduced-motion). */
  celebrate?: boolean;
}

/** Elemento de texto com conteúdo seguro (textContent, nunca HTML vindo do conteúdo). */
export function textEl<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

/** Selo redondo com o ícone na cor da instituição. */
export function badge(icon: IconId, color: number, className = 'selo'): HTMLElement {
  const el = document.createElement('span');
  el.className = className;
  el.style.setProperty('--cor-selo', cssColor(color));
  el.innerHTML = iconSvg(icon);
  return el;
}

/** Mostra um cartão no centro da tela. Resolve quando o botão é apertado. */
export function showCard(root: HTMLElement, opts: CardOptions): Promise<void> {
  return new Promise((resolve) => {
    const card = document.createElement('div');
    card.className = opts.celebrate ? 'cartao cartao--pin' : 'cartao';
    if (opts.color !== undefined) card.style.setProperty('--cor-inst', cssColor(opts.color));

    if (opts.icon && opts.color !== undefined) card.append(badge(opts.icon, opts.color, 'selo selo--grande'));
    if (opts.kicker) card.append(textEl('p', 'cartao__kicker', opts.kicker));
    const titleId = uid('cartao-titulo');
    const title = textEl('h2', 'cartao__titulo', opts.title);
    title.id = titleId;
    card.append(title);
    if (opts.text) card.append(textEl('p', 'cartao__texto', opts.text));
    for (const line of opts.lines ?? []) card.append(textEl('p', 'cartao__linha', line));

    const button = textEl('button', 'botao botao--primario', opts.button);
    button.type = 'button';
    button.dataset.autofocus = '';
    card.append(button);

    const modal = openModal(root, card, { labelledBy: titleId, variant: 'card' });
    button.addEventListener('click', () => {
      modal.close();
      resolve();
    });
  });
}

/** Botão comum da interface (sempre type="button"). */
export function uiButton(label: string, className: string): HTMLButtonElement {
  const b = textEl('button', className, label);
  b.type = 'button';
  return b;
}

/**
 * Título de uma janela longa (tela final, Como jogar, créditos). Recebe o foco ao abrir,
 * para o leitor de tela ler do começo e a janela não rolar até os botões do fim.
 */
export function screenTitle(tag: 'h1' | 'h2', className: string, text: string): HTMLHeadingElement {
  const title = textEl(tag, className, text);
  title.id = uid('tela-titulo');
  title.tabIndex = -1;
  title.dataset.autofocus = '';
  return title;
}

export interface ConfirmOptions {
  title: string;
  text: string;
  yes: string;
  no: string;
}

/** Pergunta de confirmação. Resolve true no "sim"; "não" ou Esc resolvem false. */
export function showConfirm(root: HTMLElement, opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const card = document.createElement('div');
    card.className = 'cartao';
    const titleId = uid('confirmar-titulo');
    const title = textEl('h2', 'cartao__titulo', opts.title);
    title.id = titleId;
    const yes = uiButton(opts.yes, 'botao botao--perigo');
    const no = uiButton(opts.no, 'botao botao--secundario');
    no.dataset.autofocus = '';
    const actions = document.createElement('div');
    actions.className = 'cartao__acoes';
    actions.append(no, yes);
    card.append(title, textEl('p', 'cartao__texto', opts.text), actions);

    const finish = (answer: boolean): void => {
      modal.close();
      resolve(answer);
    };
    const modal = openModal(root, card, { labelledBy: titleId, variant: 'card', onEscape: () => finish(false) });
    yes.addEventListener('click', () => finish(true));
    no.addEventListener('click', () => finish(false));
  });
}

// Textos da interface (não são conteúdo educativo).
const RESTART_TEXT: ConfirmOptions = {
  title: 'Começar de novo?',
  text: 'Todo o progresso, os pins e os acertos serão apagados.',
  yes: 'Sim, começar de novo',
  no: 'Cancelar',
};

/** "Começar de novo?" — a mesma pergunta na tela inicial, na pausa e na tela final. */
export function confirmRestart(root: HTMLElement): Promise<boolean> {
  return showConfirm(root, RESTART_TEXT);
}

// Textos da interface (não são conteúdo educativo).
const SOUND_TEXT = {
  on: 'Som: ligado',
  off: 'Som: desligado',
} as const;

/** Desenho de alto-falante: com ondas (som ligado) ou com um X (som desligado). */
const SPEAKER = '<path fill="currentColor" d="M3 9.5h4l5-4.5v14l-5-4.5H3z"/>';
const SOUND_ON_ICON = `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SPEAKER}<path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4M18.2 6.2a8.2 8.2 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const SOUND_OFF_ICON = `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SPEAKER}<path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;

/** Liga e desliga o som (src/audio/sound.ts). */
export interface SoundSwitch {
  readonly on: boolean;
  toggle(): void;
  /** Avisa quando o som liga ou desliga. Devolve a função que para de avisar. */
  onChange(listener: (on: boolean) => void): () => void;
}

/**
 * Botão "Som: ligado / desligado". Com `iconOnly`, mostra só o alto-falante e o texto vira o nome
 * do botão para leitores de tela. `dispose` para de acompanhar o som (chamar ao fechar a janela do botão).
 */
export function soundButton(
  sound: SoundSwitch,
  className: string,
  iconOnly = false,
): { button: HTMLButtonElement; dispose: () => void } {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  const render = (on: boolean): void => {
    const label = on ? SOUND_TEXT.on : SOUND_TEXT.off;
    if (iconOnly) {
      button.innerHTML = on ? SOUND_ON_ICON : SOUND_OFF_ICON;
      button.setAttribute('aria-label', label);
    } else {
      button.textContent = label;
    }
  };
  render(sound.on);
  button.addEventListener('click', () => sound.toggle());
  return { button, dispose: sound.onChange(render) };
}
