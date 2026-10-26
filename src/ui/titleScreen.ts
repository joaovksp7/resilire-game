import { GAME_NAME } from '../config';
import type { CreditSection } from '../missions/content';
import { confirmRestart, openModal, screenTitle, type SoundSwitch, soundButton, textEl, uid, uiButton } from './cards';
import { showHowToPlay } from './howToPlay';

// Textos da interface (não são conteúdo educativo; os créditos vêm de content/creditos.json).
const TEXT = {
  play: 'Jogar',
  resume: 'Continuar',
  restart: 'Começar de novo',
  result: 'Ver resultado',
  playAgain: 'Jogar de novo',
  howToPlay: 'Como jogar',
  credits: 'Créditos',
  close: 'Fechar',
  pins: (n: number, total: number) => `Pins: ${n} de ${total}`,
  notSaved: 'Neste navegador, o progresso não fica salvo quando a página é fechada.',
} as const;

/**
 * 'novo': ninguém jogou ainda → "Jogar".
 * 'continuar': há progresso → "Continuar" e "Começar de novo".
 * 'fim': todas as missões concluídas → "Ver resultado" e "Jogar de novo".
 */
export type TitleMode = 'novo' | 'continuar' | 'fim';

export interface TitleState {
  mode: TitleMode;
  /** Pins conquistados e total, mostrados quando já há progresso. */
  pins: number;
  total: number;
}

export interface TitleScreenOptions {
  credits: readonly CreditSection[];
  /** Nomes dos eixos, para a janela "Como jogar". */
  eixoNames: readonly string[];
  /** false quando o navegador bloqueia o armazenamento (o progresso some ao fechar). */
  persistent: boolean;
  /** Para o botão "Som: ligado / desligado" (a barra do topo, com o botão de som, fica escondida aqui). */
  sound: SoundSwitch;
  /** "Jogar" ou "Continuar". */
  play(): void;
  /** "Começar de novo" ou "Jogar de novo" (a confirmação já foi feita aqui). */
  restart(): void;
  showResult(): void;
  /** Chamado ao abrir e ao fechar a tela (ex.: esconder a barra da missão). */
  onToggle(open: boolean): void;
}

/** "Resilire — Cidade Resiliente" vira título grande + subtítulo. */
function splitName(name: string): [string, string | null] {
  const [main, ...rest] = name.split(' — ');
  return rest.length > 0 ? [main, rest.join(' — ')] : [name, null];
}

/** Janela de créditos, com as seções de content/creditos.json. */
function showCredits(root: HTMLElement, credits: readonly CreditSection[]): Promise<void> {
  return new Promise((resolve) => {
    const panel = document.createElement('div');
    panel.className = 'painel';
    const title = screenTitle('h2', 'painel__titulo', TEXT.credits);
    panel.append(title, textEl('p', 'creditos__jogo', GAME_NAME));
    for (const section of credits) {
      const block = document.createElement('section');
      block.className = 'painel__secao';
      block.append(textEl('h3', 'painel__subtitulo', section.titulo));
      for (const line of section.linhas) block.append(textEl('p', '', line));
      panel.append(block);
    }
    const close = uiButton(TEXT.close, 'botao botao--primario');
    const footer = document.createElement('div');
    footer.className = 'painel__rodape';
    footer.append(close);
    panel.append(footer);

    const finish = (): void => {
      modal.close();
      resolve();
    };
    const modal = openModal(root, panel, { labelledBy: title.id, variant: 'panel', onEscape: finish });
    close.addEventListener('click', finish);
  });
}

/**
 * Tela inicial: nome do jogo, Jogar/Continuar, Começar de novo, Como jogar, Créditos e Som.
 * A cidade aparece ao fundo; enquanto a tela está aberta, o jogo fica parado (ver `isOpen`).
 */
export class TitleScreen {
  private readonly root: HTMLElement;
  private readonly opts: TitleScreenOptions;
  private opened = false;

  constructor(root: HTMLElement, opts: TitleScreenOptions) {
    this.root = root;
    this.opts = opts;
  }

  /** Tela inicial aberta (inclusive com "Como jogar", créditos ou confirmação por cima). */
  get isOpen(): boolean {
    return this.opened;
  }

  open(state: TitleState): void {
    if (this.opened) return;
    this.opened = true;
    const { opts } = this;
    opts.onToggle(true);

    const screen = document.createElement('div');
    screen.className = 'inicio';
    const [name, subtitle] = splitName(GAME_NAME);
    const titleId = uid('inicio-titulo');
    const heading = document.createElement('h1');
    heading.className = 'inicio__titulo';
    heading.id = titleId;
    heading.append(textEl('span', 'inicio__nome', name));
    if (subtitle) heading.append(textEl('span', 'inicio__subtitulo', subtitle));
    screen.append(heading);
    if (state.mode !== 'novo') screen.append(textEl('p', 'inicio__progresso', TEXT.pins(state.pins, state.total)));

    const menu = document.createElement('div');
    menu.className = 'inicio__menu';
    const main =
      state.mode === 'novo' ? TEXT.play : state.mode === 'continuar' ? TEXT.resume : TEXT.result;
    const mainButton = uiButton(main, 'botao botao--primario botao--grande');
    mainButton.dataset.autofocus = '';
    menu.append(mainButton);
    let restartButton: HTMLButtonElement | null = null;
    if (state.mode !== 'novo') {
      restartButton = uiButton(state.mode === 'fim' ? TEXT.playAgain : TEXT.restart, 'botao botao--secundario');
      menu.append(restartButton);
    }
    const how = uiButton(TEXT.howToPlay, 'botao botao--secundario');
    const credits = uiButton(TEXT.credits, 'botao botao--secundario');
    const sound = soundButton(opts.sound, 'botao botao--secundario');
    menu.append(how, credits, sound.button);
    screen.append(menu);
    if (!opts.persistent) screen.append(textEl('p', 'inicio__aviso', TEXT.notSaved));

    const modal = openModal(this.root, screen, { labelledBy: titleId, variant: 'tela' });
    const close = (): void => {
      modal.close();
      sound.dispose();
      this.opened = false;
      opts.onToggle(false);
    };

    mainButton.addEventListener('click', () => {
      close();
      if (state.mode === 'fim') opts.showResult();
      else opts.play();
    });
    restartButton?.addEventListener('click', () => {
      void confirmRestart(this.root).then((yes) => {
        if (!yes) return;
        close();
        opts.restart();
      });
    });
    how.addEventListener('click', () => void showHowToPlay(this.root, opts.eixoNames));
    credits.addEventListener('click', () => void showCredits(this.root, opts.credits));
  }
}
