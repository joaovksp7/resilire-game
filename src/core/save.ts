// Progresso salvo no localStorage. Dentro de iframe o navegador pode bloquear o armazenamento
// (Safari bloqueia, Chrome particiona): nesse caso o jogo segue funcionando só com a memória.

import { TEAM } from '../config';

/** Versão 2: a equipe inteira. O save da versão 1 (`progresso:v1`, de um jogador só) é ignorado. */
const KEY = 'resilire-game:progresso:v2';
/** Som ligado ou desligado. Fica à parte do progresso: "Começar de novo" não apaga. */
const SOUND_KEY = 'resilire-game:som:v1';
/** Nomes da última equipe. Também fica à parte: "Novo jogo" apaga o progresso, mas os nomes voltam preenchidos. */
const TEAM_KEY = 'resilire-game:equipe:v1';

/** Preferência de som salva: true = ligado, false = desligado, null = nunca escolhido (ou sem armazenamento). */
export function loadSoundOn(): boolean | null {
  try {
    const value = window.localStorage.getItem(SOUND_KEY);
    return value === '1' ? true : value === '0' ? false : null;
  } catch {
    return null;
  }
}

/** Guarda a preferência de som. Sem armazenamento, ela vale só até fechar a página. */
export function saveSoundOn(on: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    // Armazenamento bloqueado: o som continua funcionando, só não lembra a escolha.
  }
}

/** Nomes digitados na última equipe ("" = sem nome), ou null se não houver (ou sem armazenamento). */
export function loadLastTeam(): string[] | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(TEAM_KEY) ?? 'null');
    return isStringArray(value) && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Guarda a última equipe. Sem armazenamento, ela vale só até fechar a página. */
export function saveLastTeam(typedNames: readonly string[]): void {
  try {
    window.localStorage.setItem(TEAM_KEY, JSON.stringify(typedNames));
  } catch {
    // Armazenamento bloqueado: o jogo continua, só não lembra a equipe.
  }
}

/** Uma casa do mapa. */
export interface SavedCell {
  readonly col: number;
  readonly row: number;
}

/** Um jogador da equipe salva, na ordem da vez. A cor do peão vem da posição (TEAM.colors). */
export interface SavedPlayer {
  /** O que foi digitado ("" = sem nome, vira "Jogador N"). */
  readonly name: string;
  /** Casa onde estava o peão. */
  readonly cell: SavedCell | null;
  /** Id da missão de que cuida (null = está ajudando a equipe). */
  readonly mission: string | null;
}

/** Um pin conquistado e quem buscou (posição na ordem da vez; 0 = Jogador 1). */
export interface SavedPin {
  readonly mission: string;
  readonly by: number;
}

export interface SaveData {
  readonly version: 2;
  /** A equipe, na ordem da vez (de 1 a TEAM.maxPlayers jogadores). */
  readonly players: readonly SavedPlayer[];
  /** De quem é a vez (posição em `players`). */
  readonly turn: number;
  /** Pins conquistados, na ordem em que foram buscados. */
  readonly pins: readonly SavedPin[];
  /** Missões em que a pergunta (ou a mochila) foi acertada de primeira. */
  readonly firstTry: readonly string[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isIndex = (value: unknown, length: number): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < length;

function parseCell(value: unknown): SavedCell | null {
  if (!isRecord(value) || !Number.isInteger(value.col) || !Number.isInteger(value.row)) return null;
  return { col: value.col as number, row: value.row as number };
}

function parsePlayer(value: unknown): SavedPlayer | null {
  if (!isRecord(value) || typeof value.name !== 'string') return null;
  if (value.mission !== null && typeof value.mission !== 'string') return null;
  return { name: value.name, cell: parseCell(value.cell), mission: value.mission };
}

/**
 * Confere o formato do que veio do armazenamento (pode estar velho ou corrompido).
 * O save da versão 1 (de um jogador só) fica na chave antiga e nem chega aqui.
 */
function parse(text: string | null): SaveData | null {
  if (!text) return null;
  try {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data) || data.version !== 2) return null;
    const rawPlayers = data.players;
    if (!Array.isArray(rawPlayers) || rawPlayers.length < 1 || rawPlayers.length > TEAM.maxPlayers) return null;
    const players = rawPlayers.map(parsePlayer);
    if (players.some((p) => p === null)) return null;
    if (!isIndex(data.turn, players.length)) return null;
    const rawPins = data.pins;
    if (!Array.isArray(rawPins)) return null;
    const pins: SavedPin[] = [];
    for (const pin of rawPins) {
      if (!isRecord(pin) || typeof pin.mission !== 'string' || !isIndex(pin.by, players.length)) return null;
      pins.push({ mission: pin.mission, by: pin.by });
    }
    if (!isStringArray(data.firstTry)) return null;
    return { version: 2, players: players as SavedPlayer[], turn: data.turn, pins, firstTry: data.firstTry };
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
