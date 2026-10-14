import type { Question } from '../missions/content';
import { cssColor, type IconId } from '../world/icons';
import { badge, openModal, textEl, uid } from './cards';

export interface Speaker {
  /** Nome do personagem (ex.: "Marta"). */
  nome: string;
  /** Função (ex.: "agente da Defesa Civil"). */
  funcao: string;
  color: number;
  icon: IconId;
}

// Textos da interface do diálogo (não são conteúdo educativo).
const TEXT = {
  next: 'Continuar',
  answer: 'Responder',
  question: 'Pergunta',
  action: 'O que você faz agora?',
  right: 'Resposta certa!',
  wrong: 'Não foi a melhor escolha',
  retry: 'Tentar de novo',
  done: 'Continuar',
} as const;

/** Embaralha uma cópia da lista (Fisher–Yates). */
function shuffled<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function button(label: string, className: string): HTMLButtonElement {
  const b = textEl('button', className, label);
  b.type = 'button';
  return b;
}

/**
 * Caixa de diálogo no rodapé, estilo visual novel: falas do personagem,
 * depois a pergunta. Errar mostra a explicação e deixa tentar de novo.
 */
export class DialogueBox {
  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  /** Mostra as falas e a pergunta. Resolve com `firstTry` = acertou na primeira tentativa. */
  run(speaker: Speaker, falas: readonly string[], question: Question): Promise<{ firstTry: boolean }> {
    return new Promise((resolve) => {
      const box = document.createElement('div');
      box.className = 'dialogo';
      box.style.setProperty('--cor-inst', cssColor(speaker.color));

      const header = document.createElement('div');
      header.className = 'dialogo__cabecalho';
      const nameId = uid('dialogo-nome');
      const names = document.createElement('div');
      const name = textEl('p', 'dialogo__nome', speaker.nome);
      name.id = nameId;
      names.append(name, textEl('p', 'dialogo__funcao', speaker.funcao));
      header.append(badge(speaker.icon, speaker.color), names);

      const body = document.createElement('div');
      body.className = 'dialogo__corpo';
      body.setAttribute('aria-live', 'polite');
      const actions = document.createElement('div');
      actions.className = 'dialogo__acoes';
      box.append(header, body, actions);

      const modal = openModal(this.root, box, { labelledBy: nameId, variant: 'dialogue' });

      // 1) Falas, uma por vez.
      let line = 0;
      const showLine = (): void => {
        body.replaceChildren(textEl('p', 'dialogo__texto', falas[line]));
        const last = line === falas.length - 1;
        const next = button(last ? TEXT.answer : TEXT.next, 'botao botao--primario');
        next.dataset.autofocus = '';
        next.addEventListener('click', () => {
          line += 1;
          if (line < falas.length) showLine();
          else showQuestion();
        });
        actions.replaceChildren(next);
        modal.focusFirst();
      };

      // 2) Pergunta com alternativas embaralhadas.
      let attempts = 0;
      const showQuestion = (): void => {
        const kicker = textEl('p', 'dialogo__kicker', question.tipo === 'acao' ? TEXT.action : TEXT.question);
        const statement = textEl('p', 'dialogo__texto', question.enunciado);
        const list = document.createElement('div');
        list.className = 'dialogo__alternativas';
        const feedback = document.createElement('div');
        feedback.className = 'dialogo__retorno';
        feedback.hidden = true;
        body.replaceChildren(kicker, statement, list, feedback);
        actions.replaceChildren();

        const options = shuffled(question.alternativas.map((alt, index) => ({ alt, index })));
        const buttons: HTMLButtonElement[] = [];
        for (const { alt, index } of options) {
          const b = button(alt.texto, 'botao botao--alternativa');
          buttons.push(b);
          b.addEventListener('click', () => {
            attempts += 1;
            const right = index === question.correta;
            for (const other of buttons) other.disabled = true;
            b.classList.add(right ? 'botao--certa' : 'botao--errada');
            if (!right) b.dataset.tried = '';

            feedback.hidden = false;
            feedback.className = `dialogo__retorno ${right ? 'dialogo__retorno--certo' : 'dialogo__retorno--errado'}`;
            feedback.replaceChildren(
              textEl('p', 'dialogo__retorno-titulo', right ? TEXT.right : TEXT.wrong),
              textEl('p', 'dialogo__retorno-texto', alt.explicacao),
            );

            const after = button(right ? TEXT.done : TEXT.retry, 'botao botao--primario');
            after.dataset.autofocus = '';
            after.addEventListener('click', () => {
              if (right) {
                modal.close();
                resolve({ firstTry: attempts === 1 });
                return;
              }
              // Tenta de novo: a alternativa errada continua bloqueada.
              feedback.hidden = true;
              actions.replaceChildren();
              for (const other of buttons) other.disabled = other.dataset.tried !== undefined;
              buttons.find((o) => !o.disabled)?.focus();
            });
            actions.replaceChildren(after);
            after.focus();
          });
          list.append(b);
        }
        buttons[0]?.focus();
      };

      showLine();
    });
  }
}
