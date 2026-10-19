import { confirmRestart, modals, openModal, textEl, uid, uiButton } from './cards';
import { showHowToPlay } from './howToPlay';

// Textos da interface (não são conteúdo educativo).
const TEXT = {
  button: 'Pausar o jogo',
  title: 'Jogo pausado',
  resume: 'Continuar',
  howToPlay: 'Como jogar',
  result: 'Ver resultado',
  restart: 'Começar de novo',
  home: 'Tela inicial',
} as const;

/** Desenho de pausa (duas barras) para o botão do HUD. */
const PAUSE_ICON =
  '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6" y="5" width="4.5" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.2" fill="currentColor"/></svg>';

export interface PauseMenuOptions {
  /** Nomes dos eixos, para a janela "Como jogar". */
  eixoNames: readonly string[];
  /** true quando todas as missões foram concluídas (mostra "Ver resultado"). */
  isFinished(): boolean;
  showResult(): void;
  /** Apaga o progresso e recomeça (a confirmação já foi feita aqui). */
  restart(): void;
  goToTitle(): void;
}

/**
 * Botão de pausa no HUD e o menu de pausa. Esc também abre o menu quando não há outra janela aberta.
 * Enquanto o menu está aberto, o jogo para (ver `isOpen`).
 */
export class PauseMenu {
  private readonly root: HTMLElement;
  private readonly opts: PauseMenuOptions;
  private opened = false;

  /** `root`: onde abrem as janelas. `bar`: onde fica o botão de pausa (a barra do topo). */
  constructor(root: HTMLElement, bar: HTMLElement, opts: PauseMenuOptions) {
    this.root = root;
    this.opts = opts;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'botao-pausa';
    button.setAttribute('aria-label', TEXT.button);
    button.setAttribute('aria-haspopup', 'dialog');
    button.innerHTML = PAUSE_ICON;
    button.addEventListener('click', () => this.open());
    bar.append(button);

    // Esc abre a pausa. Se o Esc acabou de fechar outra janela, ela já marcou o evento (defaultPrevented).
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.repeat || modals.isOpen) return;
      event.preventDefault();
      this.open();
    });
  }

  /** Menu de pausa aberto (inclusive com "Como jogar" ou a confirmação por cima). */
  get isOpen(): boolean {
    return this.opened;
  }

  open(): void {
    if (this.opened || modals.isOpen) return;
    this.opened = true;
    const { opts } = this;

    const panel = document.createElement('div');
    panel.className = 'painel painel--menu';
    const titleId = uid('pausa-titulo');
    const title = textEl('h2', 'painel__titulo', TEXT.title);
    title.id = titleId;

    const menu = document.createElement('div');
    menu.className = 'painel__menu';
    const resume = uiButton(TEXT.resume, 'botao botao--primario');
    resume.dataset.autofocus = '';
    const how = uiButton(TEXT.howToPlay, 'botao botao--secundario');
    const result = uiButton(TEXT.result, 'botao botao--secundario');
    result.hidden = !opts.isFinished();
    const restart = uiButton(TEXT.restart, 'botao botao--secundario');
    const home = uiButton(TEXT.home, 'botao botao--secundario');
    menu.append(resume, how, result, restart, home);
    panel.append(title, menu);

    const close = (): void => {
      modal.close();
      this.opened = false;
    };
    const modal = openModal(this.root, panel, { labelledBy: titleId, variant: 'panel', onEscape: close });

    resume.addEventListener('click', close);
    how.addEventListener('click', () => void showHowToPlay(this.root, opts.eixoNames));
    result.addEventListener('click', () => {
      close();
      opts.showResult();
    });
    restart.addEventListener('click', () => {
      void confirmRestart(this.root).then((yes) => {
        if (!yes) return;
        close();
        opts.restart();
      });
    });
    home.addEventListener('click', () => {
      close();
      opts.goToTitle();
    });
  }
}
