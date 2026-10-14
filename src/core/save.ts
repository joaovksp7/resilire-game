// Progresso salvo no localStorage. Dentro de iframe o navegador pode bloquear o armazenamento
// (Safari bloqueia, Chrome particiona): nesse caso o jogo segue funcionando só com a memória.

const KEY = 'resilire-game:progresso:v1';

export interface SaveData {
  readonly version: 1;
  /** Missão em andamento (null = todas concluídas). */
  readonly currentMission: string | null;
  /** Missões concluídas, na ordem em que foram feitas. */
  readonly completed: readonly string[];
  /** Missões em que a pergunta foi acertada de primeira. */
  readonly firstTry: readonly string[];
  /** Casa onde o personagem estava. */
  readonly player: { readonly col: number; readonly row: number } | null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/** Confere o formato do que veio do armazenamento (pode estar velho ou corrompido). */
function parse(text: string | null): SaveData | null {
  if (!text) return null;
  try {
    const data = JSON.parse(text) as Partial<SaveData> | null;
    if (!data || data.version !== 1) return null;
    if (data.currentMission !== null && typeof data.currentMission !== 'string') return null;
    if (!isStringArray(data.completed) || !isStringArray(data.firstTry)) return null;
    const p = data.player;
    const player =
      p && Number.isInteger(p.col) && Number.isInteger(p.row) ? { col: p.col, row: p.row } : null;
    return { version: 1, currentMission: data.currentMission ?? null, completed: data.completed, firstTry: data.firstTry, player };
  } catch {
    return null;
  }
}

/** Tenta usar o localStorage; se qualquer acesso falhar, guarda só na memória. */
export class SaveStore {
  private memory: string | null = null;
  private storage: Storage | null;

  constructor() {
    this.storage = SaveStore.probe();
  }

  /** true quando o progresso sobrevive a recarregar a página. */
  get persistent(): boolean {
    return this.storage !== null;
  }

  load(): SaveData | null {
    if (this.storage) {
      try {
        return parse(this.storage.getItem(KEY));
      } catch {
        this.storage = null;
      }
    }
    return parse(this.memory);
  }

  save(data: SaveData): void {
    const text = JSON.stringify(data);
    this.memory = text;
    if (!this.storage) return;
    try {
      this.storage.setItem(KEY, text);
    } catch {
      // Cota cheia ou bloqueio no meio do jogo: continua só na memória.
      this.storage = null;
    }
  }

  clear(): void {
    this.memory = null;
    if (!this.storage) return;
    try {
      this.storage.removeItem(KEY);
    } catch {
      this.storage = null;
    }
  }

  private static probe(): Storage | null {
    try {
      const storage = window.localStorage;
      const test = `${KEY}:teste`;
      storage.setItem(test, '1');
      storage.removeItem(test);
      return storage;
    } catch {
      return null;
    }
  }
}
