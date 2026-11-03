import { TEAM } from '../config';
import { createTeam, defaultPlayerName, type Team } from '../player/team';
import { cssColor } from '../world/icons';
import { openModal, screenTitle, textEl, uid, uiButton } from './cards';

// Textos da interface (não são conteúdo educativo).
const TEXT = {
  title: 'Quem vai jogar?',
  hint: 'O nome é opcional e não sai deste aparelho.',
  start: 'Começar',
  back: 'Voltar',
} as const;

/**
 * Janela "Quem vai jogar?": um campo de nome por jogador, com a cor e o número do peão ao lado.
 * `names` é atualizada enquanto a pessoa digita, para "Voltar" não perder o que já foi escrito.
 * Resolve com a equipe em "Começar", ou null em "Voltar" e Esc.
 */
export function showTeamSetup(root: HTMLElement, count: number, names: string[]): Promise<Team | null> {
  return new Promise((resolve) => {
    // Formulário: Enter em qualquer campo aperta "Começar".
    const form = document.createElement('form');
    form.className = 'painel';
    form.noValidate = true;
    const title = screenTitle('h2', 'painel__titulo', TEXT.title);

    const list = document.createElement('div');
    list.className = 'equipe__lista';
    for (let i = 0; i < count; i++) {
      const number = i + 1;
      const row = document.createElement('div');
      row.className = 'equipe__linha';
      row.style.setProperty('--cor-peao', cssColor(TEAM.colors[i]));

      // O número fica junto da cor: a cor nunca é a única pista. O rótulo já diz o número ao leitor de tela.
      const pawn = textEl('span', 'equipe__peao', String(number));
      pawn.setAttribute('aria-hidden', 'true');

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'equipe__nome';
      input.id = uid('equipe-nome');
      input.maxLength = TEAM.nameMaxLength;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('autocapitalize', 'words');
      input.value = names[i] ?? '';
      input.addEventListener('input', () => {
        names[i] = input.value;
      });

      const label = textEl('label', 'equipe__rotulo', defaultPlayerName(number));
      label.htmlFor = input.id;

      const field = document.createElement('div');
      field.className = 'equipe__campo';
      field.append(label, input);
      row.append(pawn, field);
      list.append(row);
    }

    const back = uiButton(TEXT.back, 'botao botao--secundario');
    const start = uiButton(TEXT.start, 'botao botao--primario');
    start.type = 'submit';
    const footer = document.createElement('div');
    footer.className = 'painel__rodape';
    footer.append(back, start);
    form.append(title, textEl('p', '', TEXT.hint), list, footer);

    const finish = (team: Team | null): void => {
      modal.close();
      resolve(team);
    };
    const modal = openModal(root, form, { labelledBy: title.id, variant: 'panel', onEscape: () => finish(null) });
    back.addEventListener('click', () => finish(null));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      finish(createTeam(Array.from({ length: count }, (_, i) => names[i] ?? '')));
    });
  });
}
