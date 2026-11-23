import type { GameContent, Mission } from '../missions/content';
import { modals, openModal, textEl, uid, uiButton } from '../ui/cards';

// Modo de teste: só existe no `npm run dev` (main.ts só carrega este arquivo com import.meta.env.DEV),
// então nunca entra no build que vai para os alunos. Abre com ?teste na URL.

// Textos da interface (não são conteúdo educativo).
const TEXT = {
  button: 'T',
  buttonLabel: 'Modo de teste: escolher missão',
  title: 'Modo de teste',
  hint: 'Escolha a missão. As anteriores contam como feitas e a visita começa direto na porta.',
  mission: (n: number, title: string, place: string) => `${n}. ${title} · ${place}`,
  close: 'Fechar',
} as const;

/** A URL pede o modo de teste (?teste). */
export function wantsTestMode(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('teste');
  } catch {
    return false;
  }
}

export interface TestMenuOptions {
  content: GameContent;
  /** Abre a visita da missão escolhida. */
  run(mission: Mission): void;
}

/** Põe o botão "T" na borda esquerda da tela e devolve a função que abre a lista de missões. */
export function installTestMenu(root: HTMLElement, opts: TestMenuOptions): () => void {
  const open = (): void => {
    if (modals.isOpen) return;
    const panel = document.createElement('div');
    panel.className = 'painel painel--menu';
    const titleId = uid('teste-titulo');
    const title = textEl('h2', 'painel__titulo', TEXT.title);
    title.id = titleId;
    const hint = textEl('p', '', TEXT.hint);
    hint.style.margin = '0';

    const menu = document.createElement('div');
    menu.className = 'painel__menu';
    opts.content.missions.forEach((mission, index) => {
      const place = opts.content.institutions.get(mission.instituicao)?.nome ?? mission.instituicao;
      const button = uiButton(TEXT.mission(index + 1, mission.titulo, place), 'botao botao--secundario');
      button.style.textAlign = 'left';
      if (index === 0) button.dataset.autofocus = '';
      button.addEventListener('click', () => {
        modal.close();
        opts.run(mission);
      });
      menu.append(button);
    });

    const footer = document.createElement('div');
    footer.className = 'painel__rodape';
    const close = uiButton(TEXT.close, 'botao botao--primario');
    footer.append(close);
    panel.append(title, hint, menu, footer);

    const modal = openModal(root, panel, { labelledBy: titleId, variant: 'panel', onEscape: () => modal.close() });
    close.addEventListener('click', () => modal.close());
  };

  const button = uiButton(TEXT.button, 'botao-pausa');
  button.setAttribute('aria-label', TEXT.buttonLabel);
  button.setAttribute('aria-haspopup', 'dialog');
  Object.assign(button.style, {
    position: 'absolute',
    left: 'var(--espaco)',
    top: '50%',
    transform: 'translateY(-50%)',
  });
  button.addEventListener('click', open);
  root.append(button);
  return open;
}
