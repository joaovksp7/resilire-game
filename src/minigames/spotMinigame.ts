import type { CenaActivity } from '../missions/content';
import { textEl, uid } from '../ui/cards';
import type { ActivityResult, ActivityTheme } from './activities';
import { button, el, openActivityPanel, resultList } from './activityPanel';
import { riskMapSvg, SPOT_POSITIONS } from './spotScenes';

// Textos da interface (não são conteúdo educativo: esse fica em content/atividades.json).
const TEXT = {
  found: (n: number, total: number) => `Áreas de risco achadas: ${n} de ${total}`,
  pick: 'Toque num ponto do mapa.',
  legend: 'Pontos do mapa',
  notSeen: 'Ainda não visto',
  risk: 'Área de risco',
  noRisk: 'Não é área de risco',
  riskTitle: 'Área de risco!',
  noRiskTitle: 'Este lugar não é área de risco',
  spotLabel: (n: number, nome: string, estado: string) => `${n}. ${nome} (${estado})`,
  said: (titulo: string, nome: string, explicacao: string) => `${nome}: ${titulo}${/[.!?]$/.test(titulo) ? '' : '.'} ${explicacao}`,
  allFound: 'Você achou todas as áreas de risco.',
  next: 'Continuar',
} as const;

/**
 * Atividade `cena` (mapa de risco): o mapa da cidade com pontos para tocar. Cada ponto é um botão
 * (funciona só com teclado). Tocar mostra a explicação no rodapé fixo; as áreas de risco precisam ser
 * achadas. Tocar num ponto que não é de risco mostra por que não é e conta como erro para o acerto de
 * primeira (nada fica bloqueado). Quando todas as áreas de risco foram achadas, aparece a conclusão.
 */
export class SpotMinigame {
  private readonly root: HTMLElement;
  private readonly onRight: () => void;

  constructor(root: HTMLElement, onRight: () => void = () => {}) {
    this.root = root;
    this.onRight = onRight;
  }

  run(activity: CenaActivity, theme: ActivityTheme): Promise<ActivityResult> {
    return new Promise((resolve) => {
      const { pontos } = activity;
      const panel = openActivityPanel(this.root, theme, activity.titulo, activity.instrucao);
      const totalRisk = pontos.filter((p) => p.risco).length;
      /** Pontos já tocados (índices em `pontos`). */
      const seen = new Set<number>();
      let tappedSafe = false;

      const counter = textEl('p', 'atividade__dica', '');

      // O mapa, com os pontos (botões) por cima.
      const map = el('div', 'mapa');
      map.innerHTML = riskMapSvg('mapa__desenho');
      const spotButtons = pontos.map((ponto, i) => {
        const b = button(String(i + 1), 'mapa__ponto');
        const pos = SPOT_POSITIONS[ponto.id];
        b.style.left = `${pos.x}%`;
        b.style.top = `${pos.y}%`;
        b.addEventListener('click', () => tap(i));
        map.append(b);
        return b;
      });

      // Legenda (não é clicável): número, nome e o que já se sabe de cada ponto.
      const legendSection = el('section', 'atividade__secao');
      const legendTitle = textEl('h3', 'atividade__secao-titulo', TEXT.legend);
      legendTitle.id = uid('mapa-legenda');
      legendSection.setAttribute('aria-labelledby', legendTitle.id);
      const legendList = el('ol', 'mapa__legenda');
      const legendStates = pontos.map((ponto, i) => {
        const li = document.createElement('li');
        const state = textEl('span', 'mapa__legenda-estado', TEXT.notSeen);
        const texts = el('span', 'mapa__legenda-texto');
        texts.append(textEl('span', 'mapa__legenda-nome', ponto.nome), state);
        li.append(textEl('span', 'mapa__legenda-numero', String(i + 1)), texts);
        legendList.append(li);
        return { li, state };
      });
      legendSection.append(legendTitle, legendList);

      // Rodapé fixo: a explicação do último ponto tocado e, no fim, "Continuar".
      const feedback = el('div', 'dialogo__retorno');
      const feedbackTitle = textEl('p', 'dialogo__retorno-titulo', '');
      const feedbackText = textEl('p', 'dialogo__retorno-texto', TEXT.pick);
      feedback.append(feedbackTitle, feedbackText);
      feedbackTitle.hidden = true;
      feedback.classList.add('mapa__retorno');
      const action = button(TEXT.next, 'botao botao--primario');
      action.hidden = true;
      action.addEventListener('click', () => finish());
      const footer = panel.footer(feedback, action, panel.notice);

      const render = (): void => {
        const found = pontos.filter((p, i) => p.risco && seen.has(i)).length;
        counter.textContent = TEXT.found(found, totalRisk);
        pontos.forEach((ponto, i) => {
          const known = seen.has(i);
          const estado = !known ? TEXT.notSeen : ponto.risco ? TEXT.risk : TEXT.noRisk;
          const b = spotButtons[i];
          b.classList.toggle('mapa__ponto--risco', known && ponto.risco);
          b.classList.toggle('mapa__ponto--seguro', known && !ponto.risco);
          b.setAttribute('aria-label', TEXT.spotLabel(i + 1, ponto.nome, estado));
          const { li, state } = legendStates[i];
          state.textContent = estado;
          li.className = !known ? '' : ponto.risco ? 'mapa__legenda--risco' : 'mapa__legenda--seguro';
        });
        action.hidden = found < totalRisk;
      };

      const tap = (i: number): void => {
        const ponto = pontos[i];
        const wasDone = pontos.every((p, j) => !p.risco || seen.has(j));
        seen.add(i);
        if (!ponto.risco && !wasDone) tappedSafe = true;
        const title = ponto.risco ? TEXT.riskTitle : TEXT.noRiskTitle;
        feedback.className = `dialogo__retorno mapa__retorno ${ponto.risco ? 'dialogo__retorno--errado' : 'dialogo__retorno--certo'}`;
        feedbackTitle.hidden = false;
        feedbackTitle.textContent = title;
        feedbackText.textContent = ponto.explicacao;
        render();
        const allFound = !action.hidden;
        panel.say(`${TEXT.said(title, ponto.nome, ponto.explicacao)}${allFound ? ` ${TEXT.allFound}` : ''}`);
        // Achou a última área de risco: o foco vai para "Continuar" (a explicação continua à vista).
        if (allFound && !wasDone) action.focus();
      };

      const finish = (): void => {
        this.onRight();
        // Primeiro as áreas de risco, depois as outras.
        const order = pontos.map((_, i) => i).sort((a, b) => Number(pontos[b].risco) - Number(pontos[a].risco));
        const items = order.map((i) => ({
          title: pontos[i].nome,
          note: pontos[i].risco ? TEXT.risk : TEXT.noRisk,
          explanation: pontos[i].explicacao,
          // Na lista, a área de risco aparece com "!" e a que não é, com "✓".
          right: !pontos[i].risco,
        }));
        panel.showResult(true, activity.conclusao, [resultList(items, false)], () => {
          panel.close();
          resolve({ firstTry: !tappedSafe });
        });
      };

      render();
      panel.show(panel.instruction, counter, map, legendSection, footer);
      spotButtons[0]?.focus();
    });
  }
}
