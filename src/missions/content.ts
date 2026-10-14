// Lê o conteúdo educativo de content/*.json e confere se está tudo ligado certo.
// Os JSON entram no build: um campo com tipo errado já dá erro no `npm run build`;
// ids que não existem são conferidos aqui, ao abrir o jogo.

import dialoguesJson from '../../content/dialogues.json';
import institutionsJson from '../../content/institutions.json';
import missionsJson from '../../content/missions.json';
import questionsJson from '../../content/questions.json';
import { INSTITUTION_IDS, type InstitutionId } from '../world/institutions';

/** Eixos em ordem fixa. */
export const EIXO_IDS = ['alerta', 'preparacao', 'durante'] as const;
export type EixoId = (typeof EIXO_IDS)[number];

export const QUESTION_TYPES = ['multipla-escolha', 'acao'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

// Formato bruto dos arquivos (o que a equipe edita). `todoValidar` é opcional em qualquer item.
interface RawInstitution {
  id: string;
  nome: string;
  nomeComPreposicao: string;
  personagem: { nome: string; funcao: string };
  todoValidar?: string;
}
interface RawEixo {
  id: string;
  nome: string;
  descricao: string;
  todoValidar?: string;
}
interface RawMission {
  id: string;
  eixo: string;
  titulo: string;
  descricao: string;
  instituicao: string;
  dialogo: string;
  pergunta: string;
  aprendizado: string;
  todoValidar?: string;
}
interface RawDialogue {
  id: string;
  falas: string[];
  todoValidar?: string;
}
interface RawQuestion {
  id: string;
  tipo: string;
  enunciado: string;
  alternativas: { texto: string; explicacao: string }[];
  correta: number;
  todoValidar?: string;
}

// Estas atribuições fazem o TypeScript conferir o formato dos JSON no build.
const rawInstitutions: RawInstitution[] = institutionsJson;
const rawMissions: { eixos: RawEixo[]; missoes: RawMission[] } = missionsJson;
const rawDialogues: RawDialogue[] = dialoguesJson;
const rawQuestions: RawQuestion[] = questionsJson;

export interface InstitutionContent extends RawInstitution {
  id: InstitutionId;
}
export interface Eixo extends RawEixo {
  id: EixoId;
}
export interface Mission extends RawMission {
  eixo: EixoId;
  instituicao: InstitutionId;
}
export type Dialogue = RawDialogue;
export interface Question extends RawQuestion {
  tipo: QuestionType;
}

export interface GameContent {
  readonly institutions: ReadonlyMap<InstitutionId, InstitutionContent>;
  readonly eixos: readonly Eixo[];
  readonly missions: readonly Mission[];
  readonly dialogues: ReadonlyMap<string, Dialogue>;
  readonly questions: ReadonlyMap<string, Question>;
}

/** Erro de conteúdo, com mensagem em português dizendo o arquivo e o item a corrigir. */
export class ContentError extends Error {
  override name = 'ContentError';
}

function fail(file: string, message: string): never {
  throw new ContentError(`content/${file}: ${message}`);
}

function requireText(file: string, where: string, field: string, value: string): void {
  if (typeof value !== 'string' || value.trim() === '') fail(file, `${where}: o campo "${field}" está vazio.`);
}

function indexById<T extends { id: string }>(file: string, items: readonly T[], label: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    requireText(file, label, 'id', item.id);
    if (map.has(item.id)) fail(file, `${label} "${item.id}" aparece duas vezes.`);
    map.set(item.id, item);
  }
  return map;
}

/** Monta o conteúdo do jogo. Lança ContentError se algo estiver faltando ou ligado errado. */
export function loadContent(
  institutions: readonly RawInstitution[] = rawInstitutions,
  missionsFile: { eixos: readonly RawEixo[]; missoes: readonly RawMission[] } = rawMissions,
  dialogues: readonly RawDialogue[] = rawDialogues,
  questions: readonly RawQuestion[] = rawQuestions,
): GameContent {
  // Instituições: todas as do mapa precisam ter nome e personagem.
  const institutionMap = indexById('institutions.json', institutions, 'a instituição');
  for (const inst of institutions) {
    const where = `instituição "${inst.id}"`;
    if (!(INSTITUTION_IDS as readonly string[]).includes(inst.id)) {
      fail('institutions.json', `${where} não existe no mapa. Ids válidos: ${INSTITUTION_IDS.join(', ')}.`);
    }
    requireText('institutions.json', where, 'nome', inst.nome);
    requireText('institutions.json', where, 'nomeComPreposicao', inst.nomeComPreposicao);
    requireText('institutions.json', where, 'personagem.nome', inst.personagem?.nome);
    requireText('institutions.json', where, 'personagem.funcao', inst.personagem?.funcao);
  }
  for (const id of INSTITUTION_IDS) {
    if (!institutionMap.has(id)) fail('institutions.json', `falta a instituição "${id}".`);
  }

  // Eixos: exatamente os três, nesta ordem.
  const eixos = missionsFile.eixos;
  if (eixos.length !== EIXO_IDS.length || eixos.some((e, i) => e.id !== EIXO_IDS[i])) {
    fail('missions.json', `os eixos precisam ser exatamente ${EIXO_IDS.join(', ')}, nesta ordem.`);
  }
  for (const e of eixos) {
    requireText('missions.json', `eixo "${e.id}"`, 'nome', e.nome);
    requireText('missions.json', `eixo "${e.id}"`, 'descricao', e.descricao);
  }

  const dialogueMap = indexById('dialogues.json', dialogues, 'o diálogo');
  for (const d of dialogues) {
    if (!Array.isArray(d.falas) || d.falas.length === 0) fail('dialogues.json', `diálogo "${d.id}" não tem falas.`);
    d.falas.forEach((fala, i) => requireText('dialogues.json', `diálogo "${d.id}"`, `falas[${i}]`, fala));
  }

  const questionMap = indexById('questions.json', questions, 'a pergunta');
  for (const q of questions) {
    const where = `pergunta "${q.id}"`;
    if (!(QUESTION_TYPES as readonly string[]).includes(q.tipo)) {
      fail('questions.json', `${where}: "tipo" precisa ser ${QUESTION_TYPES.join(' ou ')}.`);
    }
    requireText('questions.json', where, 'enunciado', q.enunciado);
    if (!Array.isArray(q.alternativas) || q.alternativas.length < 2 || q.alternativas.length > 4) {
      fail('questions.json', `${where}: precisa ter de 2 a 4 alternativas.`);
    }
    q.alternativas.forEach((a, i) => {
      requireText('questions.json', where, `alternativas[${i}].texto`, a.texto);
      requireText('questions.json', where, `alternativas[${i}].explicacao`, a.explicacao);
    });
    if (!Number.isInteger(q.correta) || q.correta < 0 || q.correta >= q.alternativas.length) {
      fail(
        'questions.json',
        `${where}: "correta" precisa ser o número da alternativa certa, de 0 a ${q.alternativas.length - 1} (a primeira é 0).`,
      );
    }
  }

  // Missões: ligações por id e eixos em ordem.
  const missions = missionsFile.missoes;
  if (missions.length === 0) fail('missions.json', 'não há nenhuma missão.');
  indexById('missions.json', missions, 'a missão');
  let lastEixo = 0;
  for (const m of missions) {
    const where = `missão "${m.id}"`;
    const eixoIndex = (EIXO_IDS as readonly string[]).indexOf(m.eixo);
    if (eixoIndex < 0) fail('missions.json', `${where}: o eixo "${m.eixo}" não existe. Use ${EIXO_IDS.join(', ')}.`);
    if (eixoIndex < lastEixo) fail('missions.json', `${where}: as missões precisam seguir a ordem dos eixos.`);
    lastEixo = eixoIndex;
    for (const field of ['titulo', 'descricao', 'aprendizado'] as const) requireText('missions.json', where, field, m[field]);
    if (!institutionMap.has(m.instituicao)) {
      fail('missions.json', `${where}: a instituição "${m.instituicao}" não existe em institutions.json.`);
    }
    if (!dialogueMap.has(m.dialogo)) fail('missions.json', `${where}: o diálogo "${m.dialogo}" não existe em dialogues.json.`);
    if (!questionMap.has(m.pergunta)) fail('missions.json', `${where}: a pergunta "${m.pergunta}" não existe em questions.json.`);
  }

  return {
    institutions: institutionMap as Map<InstitutionId, InstitutionContent>,
    eixos: eixos as readonly Eixo[],
    missions: missions as readonly Mission[],
    dialogues: dialogueMap,
    questions: questionMap as Map<string, Question>,
  };
}
