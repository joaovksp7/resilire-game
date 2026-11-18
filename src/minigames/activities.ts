import type { Activity, GameContent } from '../missions/content';
import type { IconId } from '../world/icons';
import { KitMinigame } from './kitMinigame';
import { MemoryMinigame } from './memoryMinigame';
import { MessagesMinigame } from './messagesMinigame';
import { OrderMinigame } from './orderMinigame';
import { SortMinigame } from './sortMinigame';
import { SpotMinigame } from './spotMinigame';
import { StoryMinigame } from './storyMinigame';
import { WordSearchMinigame } from './wordSearchMinigame';

export interface ActivityTheme {
  /** Cor e ícone da instituição onde a atividade acontece. */
  color: number;
  icon: IconId;
}

export interface ActivityResult {
  /** A primeira tentativa já estava certa. */
  firstTry: boolean;
}

/**
 * Abre a atividade de uma missão (de content/atividades.json) pelo tipo.
 * Cada tipo tem a sua tela; todas resolvem com `firstTry` quando a atividade termina.
 */
export class Activities {
  private readonly kit: KitMinigame;
  private readonly order: OrderMinigame;
  private readonly sort: SortMinigame;
  private readonly story: StoryMinigame;
  private readonly spot: SpotMinigame;
  private readonly messages: MessagesMinigame;
  private readonly memory: MemoryMinigame;
  private readonly wordSearch: WordSearchMinigame;

  /** `onRight`: chamado quando a atividade fica certa (ex.: tocar o som de acerto). */
  constructor(root: HTMLElement, content: GameContent, onRight: () => void = () => {}) {
    this.kit = new KitMinigame(root, content.kit, onRight);
    this.order = new OrderMinigame(root, onRight);
    this.sort = new SortMinigame(root, onRight);
    this.story = new StoryMinigame(root, onRight);
    this.spot = new SpotMinigame(root, onRight);
    this.messages = new MessagesMinigame(root, onRight);
    this.memory = new MemoryMinigame(root, onRight);
    this.wordSearch = new WordSearchMinigame(root, onRight);
  }

  run(activity: Activity, theme: ActivityTheme): Promise<ActivityResult> {
    switch (activity.tipo) {
      case 'mochila':
        return this.kit.run(theme);
      case 'ordenar':
        return this.order.run(activity, theme);
      case 'classificar':
        return this.sort.run(activity, theme);
      case 'historia':
      case 'chamada':
        return this.story.run(activity, theme);
      case 'cena':
        return this.spot.run(activity, theme);
      case 'mensagens':
        return this.messages.run(activity, theme);
      case 'memoria':
        return this.memory.run(activity, theme);
      case 'caca-palavras':
        return this.wordSearch.run(activity, theme);
      default: {
        // Um tipo novo em ACTIVITY_TYPES sem tela aqui dá erro no `npx tsc --noEmit`.
        const missing: never = activity;
        throw new Error(`Atividade sem tela: ${String((missing as Activity).tipo)}`);
      }
    }
  }
}
