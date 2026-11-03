import { TEAM } from '../config';

// Textos da interface (não são conteúdo educativo).
const TEXT = {
  defaultName: (number: number) => `Jogador ${number}`,
  and: ' e ',
} as const;

export interface TeamPlayer {
  /** Número do jogador, na ordem da vez (1 = primeiro). */
  readonly number: number;
  /** Nome mostrado no jogo: o digitado ou "Jogador N". */
  readonly name: string;
  /** O que foi digitado ("" = sem nome). É o que fica guardado para a próxima partida. */
  readonly typedName: string;
  /** Cor da jaqueta do peão. */
  readonly color: number;
}

/** Os jogadores, na ordem da vez. */
export type Team = readonly TeamPlayer[];

export function defaultPlayerName(number: number): string {
  return TEXT.defaultName(number);
}

/** Monta a equipe a partir dos nomes digitados. Sem nenhum nome na lista, vira um jogador só. */
export function createTeam(typedNames: readonly string[]): Team {
  const names = typedNames.length > 0 ? typedNames.slice(0, TEAM.maxPlayers) : [''];
  return names.map((raw, index) => {
    const typedName = raw.trim().slice(0, TEAM.nameMaxLength);
    return {
      number: index + 1,
      name: typedName || defaultPlayerName(index + 1),
      typedName,
      color: TEAM.colors[index],
    };
  });
}

/** Os nomes numa frase: "Ana", "Ana e Bia" ou "Ana, Bia e Caio". */
export function teamLabel(team: Team): string {
  const names = team.map((player) => player.name);
  const last = names.pop() ?? '';
  return names.length > 0 ? `${names.join(', ')}${TEXT.and}${last}` : last;
}
