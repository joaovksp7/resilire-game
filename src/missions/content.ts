// Lê o conteúdo educativo de content/*.json (e os créditos) e confere se está tudo ligado certo.
// Os JSON entram no build: um campo com tipo errado já dá erro no `npm run build`;
// ids que não existem são conferidos aqui, ao abrir o jogo.

import activitiesJson from '../../content/atividades.json';
import creditsJson from '../../content/creditos.json';
import dialoguesJson from '../../content/dialogues.json';
import institutionsJson from '../../content/institutions.json';
import kitJson from '../../content/kit-items.json';
import missionsJson from '../../content/missions.json';
import questionsJson from '../../content/questions.json';
import { SPOT_IDS, type SpotId } from '../minigames/spotScenes';
import { buildWordGrid, gridWord } from '../minigames/wordSearchMinigame';
import { INSTITUTION_IDS, type InstitutionId } from '../world/institutions';

/** Eixos em ordem fixa. */
export const EIXO_IDS = ['alerta', 'preparacao', 'durante', 'depois'] as const;
export type EixoId = (typeof EIXO_IDS)[number];

export const QUESTION_TYPES = ['multipla-escolha', 'acao'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * Tipos de atividade que uma missão pode ter no lugar da pergunta (content/atividades.json).
 * Cada tipo novo entra aqui junto com a tela dele (src/minigames/activities.ts).
 */
export const ACTIVITY_TYPES = [
  'mochila',
  'ordenar',
  'classificar',
  'historia',
  'chamada',
  'cena',
  'mensagens',
  'memoria',
  'caca-palavras',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// Formato bruto dos arquivos (o que a equipe edita). `todoValidar` é opcional em qualquer item.
interface RawInstitution {
  id: string;
  nome: string;
  nomeComPreposicao: string;
  personagem: { nome: string; funcao: string };
  /** Texto curto sobre o que o lugar faz. Abre a visita, antes do diálogo. */
  carta: string;
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
  /** Pergunta OU atividade: cada missão tem uma das duas. */
  pergunta?: string;
  atividade?: string;
  aprendizado: string;
  todoValidar?: string;
}
/** Uma atividade como está no arquivo: os campos além de `id` e `tipo` dependem do tipo. */
interface RawActivity {
  id: string;
  tipo: string;
  titulo?: string;
  instrucao?: string;
  /** `ordenar`: os passos, já na ordem certa (o jogo embaralha). */
  passos?: { texto: string; explicacao: string }[];
  /** `classificar`: os nomes das colunas. */
  grupos?: string[];
  /** `classificar`: os cartões; `grupo` é o número da coluna certa (a primeira é 0). */
  cartoes?: { texto: string; grupo: number; explicacao: string }[];
  /** `historia` e `chamada`: os momentos de "O que você faz?", em ordem. */
  momentos?: RawMoment[];
  /** `chamada`: quem atende a ligação (ex.: "Atendente do 193"). */
  atendente?: string;
  /** `chamada`: a escolha do número, antes da conversa. Mesmo formato de um momento. */
  discagem?: RawMoment;
  /** `cena`: os pontos do mapa; `id` liga o texto ao desenho (src/minigames/spotScenes.ts). */
  pontos?: { id: string; nome: string; risco: boolean; explicacao: string }[];
  /** `cena`: o texto do fim, quando todas as áreas de risco foram achadas. */
  conclusao?: string;
  /** `mensagens`: o texto dos dois botões. */
  respostas?: { confiar: string; conferir: string };
  /** `mensagens`: as mensagens, na ordem em que chegam. */
  mensagens?: { de: string; texto: string; confiavel: boolean; explicacao: string }[];
  /** `memoria`: os pares de situação e cuidado. */
  pares?: { situacao: string; cuidado: string; explicacao: string }[];
  /** `caca-palavras`: as palavras, escritas certo (com acento), e a explicação de cada uma. */
  palavras?: { palavra: string; explicacao: string }[];
  todoValidar?: string;
}
/** Um momento da `historia` ou da `chamada`: a situação, as alternativas e o índice da certa. */
interface RawMoment {
  situacao: string;
  alternativas: { texto: string; explicacao: string }[];
  correta: number;
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
interface RawKitItem {
  id: string;
  nome: string;
  espaco: number;
  levar: boolean;
  explicacao: string;
  todoValidar?: string;
}
interface RawKit {
  mochila: { titulo: string; instrucao: string; todoValidar?: string };
  itens: RawKitItem[];
}
interface RawCreditSection {
  titulo: string;
  linhas: string[];
  todoValidar?: string;
}

// Estas atribuições fazem o TypeScript conferir o formato dos JSON no build.
const rawInstitutions: RawInstitution[] = institutionsJson;
const rawMissions: { eixos: RawEixo[]; missoes: RawMission[] } = missionsJson;
const rawDialogues: RawDialogue[] = dialoguesJson;
const rawQuestions: RawQuestion[] = questionsJson;
const rawActivities: RawActivity[] = activitiesJson;
const rawKit: RawKit = kitJson;
const rawCredits: RawCreditSection[] = creditsJson;

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
/** Mochila de emergência: o texto e os itens ficam em content/kit-items.json. */
export interface MochilaActivity {
  readonly id: string;
  readonly tipo: 'mochila';
}
/** Um passo do `ordenar`, ou um cartão do `classificar`, com a explicação mostrada ao conferir. */
export interface OrderStep {
  readonly texto: string;
  readonly explicacao: string;
}
/** Pôr passos em ordem. `passos` já está na ordem certa. */
export interface OrdenarActivity {
  readonly id: string;
  readonly tipo: 'ordenar';
  readonly titulo: string;
  readonly instrucao: string;
  readonly passos: readonly OrderStep[];
}
export interface SortCard extends OrderStep {
  /** Coluna certa (posição em `grupos`; a primeira é 0). */
  readonly grupo: number;
}
/** Separar cartões em colunas. */
export interface ClassificarActivity {
  readonly id: string;
  readonly tipo: 'classificar';
  readonly titulo: string;
  readonly instrucao: string;
  readonly grupos: readonly string[];
  readonly cartoes: readonly SortCard[];
}
/** Um momento de "O que você faz?". `correta` é a posição da alternativa certa (a primeira é 0). */
export interface StoryMoment {
  readonly situacao: string;
  readonly alternativas: readonly OrderStep[];
  readonly correta: number;
}
/** História curta: de 2 a 4 momentos seguidos, cada um com alternativas. */
export interface HistoriaActivity {
  readonly id: string;
  readonly tipo: 'historia';
  readonly titulo: string;
  readonly instrucao: string;
  readonly momentos: readonly StoryMoment[];
}
/** Ligação: primeiro a escolha do número (`discagem`), depois a conversa com o atendente. */
export interface ChamadaActivity {
  readonly id: string;
  readonly tipo: 'chamada';
  readonly titulo: string;
  readonly instrucao: string;
  readonly atendente: string;
  readonly discagem: StoryMoment;
  readonly momentos: readonly StoryMoment[];
}
/** Um ponto do mapa de risco. */
export interface RiskSpot {
  readonly id: SpotId;
  readonly nome: string;
  /** É área de risco (precisa ser achado)? */
  readonly risco: boolean;
  readonly explicacao: string;
}
/** Mapa de risco: achar as áreas de risco tocando nos pontos do mapa. */
export interface CenaActivity {
  readonly id: string;
  readonly tipo: 'cena';
  readonly titulo: string;
  readonly instrucao: string;
  readonly pontos: readonly RiskSpot[];
  readonly conclusao: string;
}
/** Uma mensagem do celular: quem mandou, o texto e se dá para confiar. */
export interface ChatMessage {
  readonly de: string;
  readonly texto: string;
  readonly confiavel: boolean;
  readonly explicacao: string;
}
/** Confiável ou boato: as mensagens chegam uma por vez, e o aluno escolhe um dos dois botões. */
export interface MensagensActivity {
  readonly id: string;
  readonly tipo: 'mensagens';
  readonly titulo: string;
  readonly instrucao: string;
  readonly respostas: { readonly confiar: string; readonly conferir: string };
  readonly mensagens: readonly ChatMessage[];
}
/** Um par do jogo da memória: a carta da situação, a do cuidado e a explicação. */
export interface MemoryPair {
  readonly situacao: string;
  readonly cuidado: string;
  readonly explicacao: string;
}
/** Jogo da memória: achar os pares de situação e cuidado. */
export interface MemoriaActivity {
  readonly id: string;
  readonly tipo: 'memoria';
  readonly titulo: string;
  readonly instrucao: string;
  readonly pares: readonly MemoryPair[];
}
/** Uma palavra do caça-palavras (escrita certo, com acento; na grade ela fica sem acento). */
export interface SearchWord {
  readonly palavra: string;
  readonly explicacao: string;
}
/** Caça-palavras: achar as palavras na grade, que o jogo monta. */
export interface CacaPalavrasActivity {
  readonly id: string;
  readonly tipo: 'caca-palavras';
  readonly titulo: string;
  readonly instrucao: string;
  readonly palavras: readonly SearchWord[];
}
/** Uma atividade de content/atividades.json. Cada tipo tem os seus campos. */
export type Activity =
  | MochilaActivity
  | OrdenarActivity
  | ClassificarActivity
  | HistoriaActivity
  | ChamadaActivity
  | CenaActivity
  | MensagensActivity
  | MemoriaActivity
  | CacaPalavrasActivity;
export type KitItem = RawKitItem;
/** Uma seção da tela de créditos (título e linhas). */
export type CreditSection = RawCreditSection;
export interface KitContent {
  readonly titulo: string;
  readonly instrucao: string;
  readonly itens: readonly KitItem[];
  /** Espaço da mochila: a soma dos itens com "levar": true (cabem todos, e só eles). */
  readonly capacidade: number;
}

export interface GameContent {
  readonly institutions: ReadonlyMap<InstitutionId, InstitutionContent>;
  readonly eixos: readonly Eixo[];
  readonly missions: readonly Mission[];
  readonly dialogues: ReadonlyMap<string, Dialogue>;
  readonly questions: ReadonlyMap<string, Question>;
  readonly activities: ReadonlyMap<string, Activity>;
  readonly kit: KitContent;
  readonly credits: readonly CreditSection[];
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

/** Quantos passos (ou cartões) uma atividade pode ter. */
const MIN_ITEMS = 3;
const MAX_ITEMS = 8;

/** Lista de itens com `texto` e `explicacao`, de MIN_ITEMS a MAX_ITEMS. */
function checkItems(where: string, field: string, items: readonly { texto: string; explicacao: string }[] | undefined): void {
  if (!Array.isArray(items) || items.length < MIN_ITEMS || items.length > MAX_ITEMS) {
    fail('atividades.json', `${where}: "${field}" precisa ter de ${MIN_ITEMS} a ${MAX_ITEMS} itens.`);
  }
  items.forEach((item, i) => {
    requireText('atividades.json', where, `${field}[${i}].texto`, item.texto);
    requireText('atividades.json', where, `${field}[${i}].explicacao`, item.explicacao);
  });
}

/** Quantos pares o jogo da memória pode ter. */
const MIN_PAIRS = 4;
const MAX_PAIRS = 6;
/** Tamanho das palavras do caça-palavras (12 cabe na vertical da grade). */
const MIN_LETTERS = 3;
const MAX_LETTERS = 12;

/** Quantos momentos uma `historia` ou `chamada` pode ter, e quantas alternativas cada momento. */
const MIN_MOMENTS = 2;
const MAX_MOMENTS = 4;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

/** Um momento: situação, de 2 a 4 alternativas com texto e explicação, e `correta` dentro da lista. */
function checkMoment(where: string, field: string, m: RawMoment | undefined): StoryMoment {
  if (typeof m !== 'object' || m === null) fail('atividades.json', `${where}: falta "${field}".`);
  requireText('atividades.json', where, `${field}.situacao`, m.situacao);
  const alts = m.alternativas;
  if (!Array.isArray(alts) || alts.length < MIN_OPTIONS || alts.length > MAX_OPTIONS) {
    fail('atividades.json', `${where}: "${field}.alternativas" precisa ter de ${MIN_OPTIONS} a ${MAX_OPTIONS} alternativas.`);
  }
  alts.forEach((alt, i) => {
    requireText('atividades.json', where, `${field}.alternativas[${i}].texto`, alt.texto);
    requireText('atividades.json', where, `${field}.alternativas[${i}].explicacao`, alt.explicacao);
  });
  if (!Number.isInteger(m.correta) || m.correta < 0 || m.correta >= alts.length) {
    fail(
      'atividades.json',
      `${where}: "${field}.correta" precisa ser o número da alternativa certa, de 0 a ${alts.length - 1} (a primeira é 0).`,
    );
  }
  return { situacao: m.situacao, alternativas: alts, correta: m.correta };
}

/** Os momentos de uma `historia` ou `chamada`: de MIN_MOMENTS a MAX_MOMENTS. */
function checkMoments(where: string, moments: RawMoment[] | undefined): StoryMoment[] {
  if (!Array.isArray(moments) || moments.length < MIN_MOMENTS || moments.length > MAX_MOMENTS) {
    fail('atividades.json', `${where}: "momentos" precisa ter de ${MIN_MOMENTS} a ${MAX_MOMENTS} momentos.`);
  }
  return moments.map((m, i) => checkMoment(where, `momentos[${i}]`, m));
}

/** Confere uma atividade e devolve com o tipo certo. */
function checkActivity(a: RawActivity): Activity {
  const where = `atividade "${a.id}"`;
  if (!(ACTIVITY_TYPES as readonly string[]).includes(a.tipo)) {
    fail('atividades.json', `${where}: o tipo "${a.tipo}" não existe. Use ${ACTIVITY_TYPES.join(', ')}.`);
  }
  const tipo = a.tipo as ActivityType;
  if (tipo === 'mochila') return { id: a.id, tipo };

  requireText('atividades.json', where, 'titulo', a.titulo ?? '');
  requireText('atividades.json', where, 'instrucao', a.instrucao ?? '');
  const titulo = a.titulo as string;
  const instrucao = a.instrucao as string;

  if (tipo === 'ordenar') {
    checkItems(where, 'passos', a.passos);
    return { id: a.id, tipo, titulo, instrucao, passos: a.passos as OrderStep[] };
  }

  if (tipo === 'historia') {
    return { id: a.id, tipo, titulo, instrucao, momentos: checkMoments(where, a.momentos) };
  }

  if (tipo === 'cena') {
    const pontos = a.pontos;
    if (!Array.isArray(pontos) || pontos.length < MIN_ITEMS || pontos.length > MAX_ITEMS) {
      fail('atividades.json', `${where}: "pontos" precisa ter de ${MIN_ITEMS} a ${MAX_ITEMS} pontos.`);
    }
    const seen = new Set<string>();
    pontos.forEach((pt, i) => {
      requireText('atividades.json', where, `pontos[${i}].id`, pt.id);
      if (!(SPOT_IDS as readonly string[]).includes(pt.id)) {
        fail('atividades.json', `${where}: o ponto "${pt.id}" não existe no desenho do mapa. Ids que existem: ${SPOT_IDS.join(', ')}.`);
      }
      if (seen.has(pt.id)) fail('atividades.json', `${where}: o ponto "${pt.id}" aparece duas vezes.`);
      seen.add(pt.id);
      requireText('atividades.json', where, `pontos[${i}].nome`, pt.nome);
      requireText('atividades.json', where, `pontos[${i}].explicacao`, pt.explicacao);
      if (typeof pt.risco !== 'boolean') {
        fail('atividades.json', `${where}: em pontos[${i}], "risco" precisa ser true (é área de risco) ou false (não é).`);
      }
    });
    if (!pontos.some((pt) => pt.risco)) fail('atividades.json', `${where}: nenhum ponto tem "risco": true.`);
    requireText('atividades.json', where, 'conclusao', a.conclusao ?? '');
    return { id: a.id, tipo, titulo, instrucao, pontos: pontos as RiskSpot[], conclusao: a.conclusao as string };
  }

  if (tipo === 'mensagens') {
    requireText('atividades.json', where, 'respostas.confiar', a.respostas?.confiar ?? '');
    requireText('atividades.json', where, 'respostas.conferir', a.respostas?.conferir ?? '');
    const mensagens = a.mensagens;
    if (!Array.isArray(mensagens) || mensagens.length < MIN_ITEMS || mensagens.length > MAX_ITEMS) {
      fail('atividades.json', `${where}: "mensagens" precisa ter de ${MIN_ITEMS} a ${MAX_ITEMS} mensagens.`);
    }
    mensagens.forEach((msg, i) => {
      requireText('atividades.json', where, `mensagens[${i}].de`, msg.de);
      requireText('atividades.json', where, `mensagens[${i}].texto`, msg.texto);
      requireText('atividades.json', where, `mensagens[${i}].explicacao`, msg.explicacao);
      if (typeof msg.confiavel !== 'boolean') {
        fail('atividades.json', `${where}: em mensagens[${i}], "confiavel" precisa ser true (pode confiar) ou false (conferir antes).`);
      }
    });
    return { id: a.id, tipo, titulo, instrucao, respostas: a.respostas as MensagensActivity['respostas'], mensagens };
  }

  if (tipo === 'memoria') {
    const pares = a.pares;
    if (!Array.isArray(pares) || pares.length < MIN_PAIRS || pares.length > MAX_PAIRS) {
      fail('atividades.json', `${where}: "pares" precisa ter de ${MIN_PAIRS} a ${MAX_PAIRS} pares.`);
    }
    pares.forEach((par, i) => {
      requireText('atividades.json', where, `pares[${i}].situacao`, par.situacao);
      requireText('atividades.json', where, `pares[${i}].cuidado`, par.cuidado);
      requireText('atividades.json', where, `pares[${i}].explicacao`, par.explicacao);
    });
    return { id: a.id, tipo, titulo, instrucao, pares };
  }

  if (tipo === 'caca-palavras') {
    const palavras = a.palavras;
    if (!Array.isArray(palavras) || palavras.length < MIN_ITEMS || palavras.length > MAX_ITEMS) {
      fail('atividades.json', `${where}: "palavras" precisa ter de ${MIN_ITEMS} a ${MAX_ITEMS} palavras.`);
    }
    palavras.forEach((p, i) => {
      requireText('atividades.json', where, `palavras[${i}].palavra`, p.palavra);
      requireText('atividades.json', where, `palavras[${i}].explicacao`, p.explicacao);
      const letters = gridWord(p.palavra);
      if (!/^[A-Z]+$/.test(letters)) {
        fail('atividades.json', `${where}: a palavra "${p.palavra}" só pode ter letras (sem espaço, hífen ou número).`);
      }
      if (letters.length < MIN_LETTERS || letters.length > MAX_LETTERS) {
        fail('atividades.json', `${where}: a palavra "${p.palavra}" precisa ter de ${MIN_LETTERS} a ${MAX_LETTERS} letras.`);
      }
    });
    const letters = palavras.map((p) => gridWord(p.palavra));
    letters.forEach((w, i) => {
      const other = letters.findIndex((o, j) => j !== i && o.includes(w));
      if (other >= 0) {
        fail(
          'atividades.json',
          letters[other] === w
            ? `${where}: a palavra "${palavras[i].palavra}" aparece duas vezes.`
            : `${where}: a palavra "${palavras[i].palavra}" está dentro de "${palavras[other].palavra}". Troque uma das duas.`,
        );
      }
    });
    if (buildWordGrid(palavras.map((p) => p.palavra)) === null) {
      fail('atividades.json', `${where}: as palavras não cabem na grade. Use menos palavras ou palavras menores.`);
    }
    return { id: a.id, tipo, titulo, instrucao, palavras };
  }

  if (tipo === 'chamada') {
    requireText('atividades.json', where, 'atendente', a.atendente ?? '');
    const discagem = checkMoment(where, 'discagem', a.discagem);
    const momentos = checkMoments(where, a.momentos);
    return { id: a.id, tipo, titulo, instrucao, atendente: a.atendente as string, discagem, momentos };
  }

  // classificar
  const grupos = a.grupos;
  if (!Array.isArray(grupos) || grupos.length < 2 || grupos.length > 3) {
    fail('atividades.json', `${where}: "grupos" precisa ter 2 ou 3 nomes de coluna.`);
  }
  grupos.forEach((g, i) => requireText('atividades.json', where, `grupos[${i}]`, g));
  checkItems(where, 'cartoes', a.cartoes);
  const cartoes = a.cartoes as SortCard[];
  cartoes.forEach((c, i) => {
    if (!Number.isInteger(c.grupo) || c.grupo < 0 || c.grupo >= grupos.length) {
      fail(
        'atividades.json',
        `${where}: em cartoes[${i}], "grupo" precisa ser o número da coluna certa, de 0 a ${grupos.length - 1} (a primeira é 0).`,
      );
    }
  });
  grupos.forEach((g, i) => {
    if (!cartoes.some((c) => c.grupo === i)) fail('atividades.json', `${where}: a coluna "${g}" não tem nenhum cartão.`);
  });
  return { id: a.id, tipo, titulo, instrucao, grupos, cartoes };
}

/** Monta o conteúdo do jogo. Lança ContentError se algo estiver faltando ou ligado errado. */
export function loadContent(
  institutions: readonly RawInstitution[] = rawInstitutions,
  missionsFile: { eixos: readonly RawEixo[]; missoes: readonly RawMission[] } = rawMissions,
  dialogues: readonly RawDialogue[] = rawDialogues,
  questions: readonly RawQuestion[] = rawQuestions,
  kitFile: RawKit = rawKit,
  credits: readonly RawCreditSection[] = rawCredits,
  activities: readonly RawActivity[] = rawActivities,
): GameContent {
  // Instituições: todas as do mapa precisam ter nome, personagem e carta.
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
    requireText('institutions.json', where, 'carta', inst.carta);
  }
  for (const id of INSTITUTION_IDS) {
    if (!institutionMap.has(id)) fail('institutions.json', `falta a instituição "${id}".`);
  }

  // Eixos: exatamente os quatro, nesta ordem.
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

  // Atividades: cada uma com um tipo que o jogo sabe abrir e os campos desse tipo.
  indexById('atividades.json', activities, 'a atividade');
  const activityMap = new Map<string, Activity>(activities.map((a) => [a.id, checkActivity(a)]));

  // Kit de emergência: itens com espaço e "levar" (true = útil, false = não é prioridade).
  requireText('kit-items.json', 'mochila', 'titulo', kitFile.mochila?.titulo);
  requireText('kit-items.json', 'mochila', 'instrucao', kitFile.mochila?.instrucao);
  const kitItems = kitFile.itens;
  if (!Array.isArray(kitItems) || kitItems.length === 0) fail('kit-items.json', 'não há nenhum item.');
  indexById('kit-items.json', kitItems, 'o item');
  for (const item of kitItems) {
    const where = `item "${item.id}"`;
    requireText('kit-items.json', where, 'nome', item.nome);
    requireText('kit-items.json', where, 'explicacao', item.explicacao);
    if (!Number.isInteger(item.espaco) || item.espaco < 1) {
      fail('kit-items.json', `${where}: "espaco" precisa ser um número inteiro, de 1 para cima.`);
    }
    if (typeof item.levar !== 'boolean') {
      fail('kit-items.json', `${where}: "levar" precisa ser true (vai na mochila) ou false (não vai).`);
    }
  }
  const capacidade = kitItems.reduce((sum, item) => sum + (item.levar ? item.espaco : 0), 0);
  if (capacidade === 0) fail('kit-items.json', 'nenhum item tem "levar": true.');

  // Créditos: cada seção com título e pelo menos uma linha.
  if (!Array.isArray(credits) || credits.length === 0) fail('creditos.json', 'não há nenhuma seção.');
  for (const [i, s] of credits.entries()) {
    const where = `seção ${i + 1}`;
    requireText('creditos.json', where, 'titulo', s.titulo);
    if (!Array.isArray(s.linhas) || s.linhas.length === 0) fail('creditos.json', `${where} ("${s.titulo}") não tem linhas.`);
    for (const [j, linha] of s.linhas.entries()) requireText('creditos.json', `${where} ("${s.titulo}")`, `linhas[${j}]`, linha);
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
    // O campo "minijogo" virou "atividade" (com o id de uma atividade de atividades.json).
    if ('minijogo' in m) {
      fail('missions.json', `${where}: o campo "minijogo" agora se chama "atividade", com o id de uma atividade de atividades.json.`);
    }
    if ((m.pergunta === undefined) === (m.atividade === undefined)) {
      fail('missions.json', `${where}: use "pergunta" ou "atividade" (uma das duas, não as duas).`);
    }
    if (m.pergunta !== undefined && !questionMap.has(m.pergunta)) {
      fail('missions.json', `${where}: a pergunta "${m.pergunta}" não existe em questions.json.`);
    }
    if (m.atividade !== undefined && !activityMap.has(m.atividade)) {
      fail('missions.json', `${where}: a atividade "${m.atividade}" não existe em atividades.json.`);
    }
  }

  return {
    institutions: institutionMap as Map<InstitutionId, InstitutionContent>,
    eixos: eixos as readonly Eixo[],
    missions: missions as readonly Mission[],
    dialogues: dialogueMap,
    questions: questionMap as Map<string, Question>,
    activities: activityMap,
    kit: { titulo: kitFile.mochila.titulo, instrucao: kitFile.mochila.instrucao, itens: kitItems, capacidade },
    credits,
  };
}
