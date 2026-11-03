import { GAME_NAME, TEAM } from '../config';
import type { CreditSection } from '../missions/content';
import { createTeam, type Team, teamLabel } from '../player/team';
import { confirmRestart, openModal, screenTitle, type SoundSwitch, soundButton, textEl, uid, uiButton } from './cards';
import { showHowToPlay } from './howToPlay';
import { createTitleScene } from './titleScene';
import { showTeamSetup } from './teamSetup';

// Textos da interface (não são conteúdo educativo; os créditos vêm de content/creditos.json).
const TEXT = {
  howMany: 'Quantos vão jogar?',
  players: (n: number) => (n === 1 ? '1 jogador' : `${n} jogadores`),
  chosen: (n: number) => (n === 1 ? '1 jogador escolhido' : `${n} jogadores escolhidos`),
  play: 'Jogar',
  resume: 'Continuar',
  restart: 'Novo jogo',
  result: 'Ver resultado',
  playAgain: 'Jogar de novo',
  howToPlay: 'Como jogar',
  credits: 'Créditos',
  close: 'Fechar',
  pins: (n: number, total: number) => `Pins: ${n} de ${total}`,
  teamPins: (names: string, pins: string) => `${names} · ${pins}`,
  notSaved: 'Neste navegador, o progresso não fica salvo quando a página é fechada.',
} as const;

/**
 * 'novo': ninguém jogou ainda → escolha de quantos vão jogar e "Jogar".
 * 'continuar': há progresso → "Continuar" e "Novo jogo".
 * 'fim': todas as missões concluídas → "Ver resultado" e "Jogar de novo".
 */
export type TitleMode = 'novo' | 'continuar' | 'fim';

export interface TitleState {
  mode: TitleMode;
  /** Pins conquistados e total, mostrados quando já há progresso. */
  pins: number;
  total: number;
  /** No modo 'novo', a última equipe (o seletor começa nela); nos outros, quem está jogando. */
  team: Team;
}

export interface TitleScreenOptions {
  credits: readonly CreditSection[];
  /** Nomes dos eixos, para a janela "Como jogar". */
  eixoNames: readonly string[];
  /** false quando o navegador bloqueia o armazenamento (o progresso some ao fechar). */
  persistent: boolean;
  /** Para o botão "Som: ligado / desligado" (a barra do topo, com o botão de som, fica escondida aqui). */
  sound: SoundSwitch;
  /** "Jogar", depois de escolher a equipe. */
  startTeam(team: Team): void;
  /** "Continuar". */
  resume(): void;
  /** "Novo jogo" ou "Jogar de novo" (a confirmação já foi feita aqui). */
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

/** O nome com as letras separadas para a animação. O leitor de tela lê o nome inteiro, não letra por letra. */
function animatedName(name: string): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.className = 'inicio__nome';
  const letters = document.createElement('span');
  letters.setAttribute('aria-hidden', 'true');
  [...name].forEach((char, index) => {
    const letter = textEl('span', 'inicio__letra', char);
    letter.style.setProperty('--ordem', String(index));
    letters.append(letter);
  });
  wrapper.append(textEl('span', 'so-leitor', name), letters);
  return wrapper;
}

/**
 * Seletor "Quantos vão jogar?": um botão para cada número, e o escolhido fica marcado.
 * `onChange` avisa a troca (a cena mostra um peão para cada jogador).
 */
function playerCountSelector(initial: number, onChange: (count: number) => void): { element: HTMLElement; count: () => number } {
  let count = initial;
  const group = document.createElement('div');
  group.className = 'seletor';
  group.setAttribute('role', 'group');
  const label = textEl('p', 'seletor__rotulo', TEXT.howMany);
  label.id = uid('seletor-rotulo');
  group.setAttribute('aria-labelledby', label.id);

  // Anuncia a troca para leitores de tela. Vazio no começo, para não falar ao abrir a tela.
  const status = document.createElement('p');
  status.className = 'so-leitor';
  status.setAttribute('role', 'status');

  const row = document.createElement('div');
  row.className = 'seletor__botoes';
  const buttons: HTMLButtonElement[] = [];
  for (let n = 1; n <= TEAM.maxPlayers; n++) {
    const b = uiButton(String(n), 'botao seletor__botao');
    b.setAttribute('aria-label', TEXT.players(n));
    b.setAttribute('aria-pressed', String(n === count));
    // O foco começa no número escolhido: quem usa teclado passa pelo seletor antes de "Jogar".
    if (n === count) b.dataset.autofocus = '';
    b.addEventListener('click', () => {
      count = n;
      buttons.forEach((other, i) => other.setAttribute('aria-pressed', String(i + 1 === n)));
      status.textContent = TEXT.chosen(n);
      onChange(n);
    });
    buttons.push(b);
    row.append(b);
  }
  group.append(label, row, status);
  return { element: group, count: () => count };
}

/**
 * Tela inicial: nome do jogo, quantos vão jogar, Jogar/Continuar, Novo jogo, Como jogar, Créditos e Som.
 * Tem cena própria ao fundo (titleScene.ts); enquanto a tela está aberta, o jogo fica parado e a cidade não é desenhada (ver `isOpen`).
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

    const scene = createTitleScene(state.team.length);
    const [name, subtitle] = splitName(GAME_NAME);
    const titleId = uid('inicio-titulo');
    const heading = document.createElement('h1');
    heading.className = 'inicio__titulo';
    heading.id = titleId;
    heading.append(animatedName(name));
    if (subtitle) heading.append(textEl('span', 'inicio__subtitulo', subtitle));

    const screen = document.createElement('div');
    screen.className = 'inicio';
    if (state.mode !== 'novo') {
      const pins = TEXT.pins(state.pins, state.total);
      const progress = state.team.length > 1 ? TEXT.teamPins(teamLabel(state.team), pins) : pins;
      screen.append(textEl('p', 'inicio__progresso', progress));
    }
    const selector = state.mode === 'novo' ? playerCountSelector(state.team.length, scene.setPlayers) : null;
    if (selector) screen.append(selector.element);

    const menu = document.createElement('div');
    menu.className = 'inicio__menu';
    const main =
      state.mode === 'novo' ? TEXT.play : state.mode === 'continuar' ? TEXT.resume : TEXT.result;
    const mainButton = uiButton(main, 'botao botao--primario botao--grande');
    if (!selector) mainButton.dataset.autofocus = '';
    menu.append(mainButton);
    let restartButton: HTMLButtonElement | null = null;
    if (state.mode !== 'novo') {
      restartButton = uiButton(state.mode === 'fim' ? TEXT.playAgain : TEXT.restart, 'botao botao--secundario');
      menu.append(restartButton);
    }
    const how = uiButton(TEXT.howToPlay, 'botao botao--secundario inicio__metade');
    const credits = uiButton(TEXT.credits, 'botao botao--secundario inicio__metade');
    const sound = soundButton(opts.sound, 'botao botao--secundario');
    menu.append(how, credits, sound.button);
    screen.append(menu);
    if (!opts.persistent) screen.append(textEl('p', 'inicio__aviso', TEXT.notSaved));

    const content = document.createElement('div');
    content.className = 'abertura__conteudo';
    content.append(heading, screen);
    const opening = document.createElement('div');
    opening.className = 'abertura';
    opening.append(scene.element, content);

    const modal = openModal(this.root, opening, { labelledBy: titleId, variant: 'abertura' });
    const close = (): void => {
      modal.close();
      sound.dispose();
      this.opened = false;
      opts.onToggle(false);
    };

    // Nomes da janela "Quem vai jogar?": começam com os da última equipe e sobrevivem ao "Voltar".
    const names = state.team.map((player) => player.typedName);
    const begin = (team: Team): void => {
      close();
      opts.startTeam(team);
    };

    mainButton.addEventListener('click', () => {
      if (selector) {
        // Com 1 jogador vai direto para a cidade; com mais, antes vem "Quem vai jogar?".
        const count = selector.count();
        if (count === 1) begin(createTeam(names.slice(0, 1)));
        else void showTeamSetup(this.root, count, names).then((team) => team && begin(team));
        return;
      }
      close();
      if (state.mode === 'fim') opts.showResult();
      else opts.resume();
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
