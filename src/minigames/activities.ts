import type { Activity, GameContent } from '../missions/content';
import type { IconId } from '../world/icons';
import { KitMinigame } from './kitMinigame';

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

  /** `onRight`: chamado quando a atividade fica certa (ex.: tocar o som de acerto). */
  constructor(root: HTMLElement, content: GameContent, onRight: () => void = () => {}) {
    this.kit = new KitMinigame(root, content.kit, onRight);
  }

  run(activity: Activity, theme: ActivityTheme): Promise<ActivityResult> {
    switch (activity.tipo) {
      case 'mochila':
        return this.kit.run(theme);
      default: {
        // Um tipo novo em ACTIVITY_TYPES sem tela aqui dá erro no `npx tsc --noEmit`.
        const missing: never = activity.tipo;
        throw new Error(`Atividade sem tela: ${String(missing)}`);
      }
    }
  }
}
