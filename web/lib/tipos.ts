/**
 * Tipos das RESPOSTAS da API TRAEL, espelhando os DTOs reais do backend.
 *
 * Cada bloco aponta o arquivo de origem em `backend/src/...`. Nada aqui é
 * inventado: se um campo não está no DTO do backend, ele não existe aqui — e
 * se o backend mudar, este arquivo muda junto (é o contrato, não um palpite).
 *
 * REGRA DE OURO (CLAUDE.md): o front NÃO compara campos, não aplica limiar e
 * não recalcula veredito. Por isso aqui só existem tipos de LEITURA e os DTOs
 * de entrada dos endpoints — nenhuma função de decisão.
 */

/* ------------------------------------------------------------------ *
 * Vocabulários fechados (uniões literais, como no backend)
 * ------------------------------------------------------------------ */

/**
 * Precedência do agregado: `divergente` > `nao_conferivel` > `conforme`.
 * Origem: `conferencias/engine/tipos.ts` (+ `VEREDITOS` em
 * `dto/resultado-execucao.dto.ts`).
 */
export type Veredito = "conforme" | "divergente" | "nao_conferivel";

export const VEREDITOS: readonly Veredito[] = [
  "divergente",
  "nao_conferivel",
  "conforme",
] as const;

/**
 * Por que a engine não pôde afirmar o campo. Só acompanha `nao_conferivel`, e
 * só existe na resposta do POST — a releitura (`GET /conferencias/:id/campos`)
 * NÃO traz motivo (gap 22 do CLAUDE.md).
 * Origem: `MOTIVOS_CAMPO` em `dto/resultado-execucao.dto.ts`.
 */
export type MotivoCampo =
  | "sem-valor-esperado"
  | "sem-leitura"
  | "leituras-conflitantes"
  | "leitura-de-outro-campo"
  | "confianca-abaixo-do-limiar"
  | "leitura-nao-corroborada";

/**
 * VISTA da peça que a foto mostra — não a marcação (mudança de eixo de
 * 2026-07-25). Origem: `extracao/ports/extractor.port.ts` (`FonteFisica`), de
 * onde `fotos-evidencia/fonte-fisica.enum.ts` deriva com `satisfies`.
 */
export type FonteFisica =
  | "base"
  | "topo"
  | "frente"
  | "traseira"
  | "lateral-esquerda"
  | "lateral-direita"
  | "placa"
  | "etiqueta"
  | "geral";

export const FONTES_FISICAS: readonly FonteFisica[] = [
  "base",
  "topo",
  "frente",
  "traseira",
  "lateral-esquerda",
  "lateral-direita",
  "placa",
  "etiqueta",
  "geral",
] as const;

/** Rótulo de chão de fábrica para cada vista (o slug não vai para a tela). */
export const ROTULO_FONTE_FISICA: Record<FonteFisica, string> = {
  base: "Base",
  topo: "Topo",
  frente: "Frente",
  traseira: "Traseira",
  "lateral-esquerda": "Lateral esquerda",
  "lateral-direita": "Lateral direita",
  placa: "Placa (close)",
  etiqueta: "Etiqueta (close)",
  geral: "Foto geral",
};

/**
 * COMO a marcação foi gravada — deduzido do nome do campo pelo backend
 * (gap 19). Origem: `TIPOS_DE_MARCACAO` em `dto/plano-de-fotos.dto.ts`.
 */
export type TipoDeMarcacao = "relevo" | "tinta" | "indefinido";

/* ------------------------------------------------------------------ *
 * Projeções compartilhadas
 * Origem: conferencias/dto/resumos-compartilhados.dto.ts
 * ------------------------------------------------------------------ */

export interface CheckpointResumo {
  /** Slug estável da etapa — é por ele que gates casam (`fixacao-placa`). */
  codigo: string;
  /** Nome exibível; só para a tela. */
  nome: string;
}

export interface EtapaResumo extends CheckpointResumo {
  /** Posição na linha (1 = adesivação … 4 = fixação da placa). */
  ordem: number;
}

/**
 * A foto que lastreia uma leitura. ATENÇÃO: sob `FILE_DRIVER=s3` a `url` é
 * assinada e EXPIRA EM 1 HORA — não guarde em store de longa duração; recarregue
 * a conferência para obter uma nova.
 */
export interface FotoDaEvidencia {
  id: string;
  url: string;
  /** Vista que a foto mostra; é PERSISTIDO, não deduzido pela tela. */
  fonteFisica: string;
}

export interface TransformadorResumo {
  id: string;
  /** Chave de negócio da peça (série do fabricante). */
  numeroSerie: string;
  /** Numeração do cliente — única por cliente, nunca chave. */
  patrimonio: string;
  /** String livre nesta rodada; vazia quando a etiqueta não traz. */
  cliente: string;
}

/* ------------------------------------------------------------------ *
 * Execução da conferência
 * Origem: conferencias/dto/resultado-execucao.dto.ts
 *         conferencias/dto/resultado-execucao-com-extracao.dto.ts
 * ------------------------------------------------------------------ */

/** Uma leitura que participou da comparação entre campos irmãos. */
export interface LeituraDoGrupo {
  campo: string;
  fonteFisica: string;
  /** Valor CRU lido nesta posição. */
  valorLido: string;
  confianca: number | null;
  veredito: Veredito;
}

/**
 * Campos IRMÃOS (o QR manda todos carregarem o mesmo número) que leram valores
 * diferentes entre si. Só REBAIXA, nunca promove. NÃO É PERSISTIDO: some na
 * releitura — se a tela precisa mostrar, guarde a resposta do POST.
 */
export interface IncoerenciaEntreCampos {
  valorEsperado: string;
  campos: string[];
  valoresLidos: string[];
  leituras: LeituraDoGrupo[];
}

/** Um campo comparado pela engine e já persistido como CampoConferido. */
export interface CampoExecutado {
  /** Nome na checklist; o PREFIXO é contrato (`serie-`, `patrimonio-`…). */
  campo: string;
  /** Vista da peça de onde ele sai — mesmo vocabulário do upload. */
  fonteFisica: string;
  /** Obrigatório ilegível bloqueia o `conforme` geral; opcional não bloqueia. */
  obrigatorio: boolean;
  /** `null` quando o QR não traz o dado do campo (ex.: `potencia-*`). */
  valorEsperado: string | null;
  valorLido: string | null;
  confianca: number | null;
  veredito: Veredito;
  /** Só vem com `nao_conferivel`. */
  motivo?: MotivoCampo;
  /** Só vem com `motivo === 'leitura-de-outro-campo'`. */
  campoDaLeitura?: string;
  /** Id do CampoConferido gravado — o lastro auditável. */
  campoConferidoId: string;
  /** JSON `{"Width","Height","Left","Top"}` normalizado 0..1, já orientado. */
  regiaoLeitura: string | null;
  fotoEvidencia: FotoDaEvidencia | null;
}

export interface ConferenciaDaExecucao {
  id: string;
  vereditoGeral: string;
  createdAt: string;
  checkpoint: CheckpointResumo | null;
}

export interface TransformadorDaExecucao extends TransformadorResumo {
  /** Código do ProjetoModelo cuja checklist foi usada. */
  projetoModeloCodigo: string;
}

export interface ResultadoExecucao {
  conferencia: ConferenciaDaExecucao;
  transformador: TransformadorDaExecucao;
  /** Etapa que definiu o RECORTE; `null` = checklist inteira. */
  etapaAvaliada: EtapaResumo | null;
  /** Itens do recorte; pode ser MAIOR que `campos.length`. */
  camposAvaliados: number;
  campos: CampoExecutado[];
  incoerencias: IncoerenciaEntreCampos[];
}

/** O que a visão fez nesta execução (transparência de custo). */
export interface ResumoExtracao {
  /** `mock` | `textract` | `bedrock` (env `EXTRACTOR_DRIVER`). */
  driver: string;
  fotos: number;
  leiturasProduzidas: number;
  /** Fotos ignoradas porque nenhum campo do recorte sai da vista delas. */
  fotosForaDoRecorte: number;
  achadosLivres: number;
}

export interface OcorrenciaAchado {
  fotoEvidenciaId: string | null;
  foto: FotoDaEvidencia | null;
  confianca: number;
  regiaoLeitura: string | null;
}

/** Texto com cara de identificador que a visão leu e o QR não conhece. */
export interface AchadoInconsistente {
  texto: string;
  ocorrencias: OcorrenciaAchado[];
}

/**
 * Resposta de `POST /conferencias/executar-com-fotos` — o caminho principal do
 * operador. `achadosInconsistentes` é ALARME informativo: nunca entra no
 * veredito e não é persistido.
 */
export interface ResultadoExecucaoComExtracao extends ResultadoExecucao {
  extracao: ResumoExtracao;
  achadosInconsistentes: AchadoInconsistente[];
}

/* ------------------------------------------------------------------ *
 * Releitura do veredito
 * Origem: conferencias/consultas/veredito-conferencia.ts
 * ------------------------------------------------------------------ */

/**
 * Um campo como o banco guardou. Diferenças em relação a `CampoExecutado`:
 * sem `motivo` (gap 22), `fonteFisica`/`obrigatorio` podem ser `null` (são
 * re-resolvidos da checklist) e `valorEsperado` é string vazia em vez de null.
 */
export interface CampoVeredito {
  /** Id do CampoConferido — chave estável de lista. */
  id: string;
  campo: string;
  fonteFisica: string | null;
  obrigatorio: boolean | null;
  /** String VAZIA (não null) quando não havia valor esperado. */
  valorEsperado: string;
  valorLido: string | null;
  confianca: number | null;
  veredito: string | null;
  regiaoLeitura: string | null;
  fotoEvidencia: FotoDaEvidencia | null;
}

export interface ConferenciaDoVeredito {
  id: string;
  vereditoGeral: string | null;
  createdAt: string;
  /** Exceção aceita pelo time, justificada. */
  observacao: string | null;
  /** `null` = conferência da checklist inteira. */
  checkpoint: EtapaResumo | null;
}

export interface VereditoConferencia {
  conferencia: ConferenciaDoVeredito;
  transformador: TransformadorResumo;
  /** Na ordem da checklist do ProjetoModelo. */
  campos: CampoVeredito[];
}

/* ------------------------------------------------------------------ *
 * Plano de fotos
 * Origem: conferencias/dto/plano-de-fotos.dto.ts
 * ------------------------------------------------------------------ */

export interface ItemDoPlano {
  campo: string;
  fonteFisica: string;
  obrigatorio: boolean;
  tipoMarcacao: TipoDeMarcacao;
  /** Etapa em que a marcação passa a existir; `null` = qualquer gate. */
  entraNaEtapa: EtapaResumo | null;
}

/** Os campos de UMA vista — uma foto cobre todos eles de uma vez. */
export interface VistaDoPlano {
  fonteFisica: string;
  campos: ItemDoPlano[];
}

export interface PlanoDaEtapa {
  etapa: EtapaResumo | null;
  vistas: VistaDoPlano[];
}

export interface ProjetoDoPlano {
  codigo: string;
  descricao: string | null;
}

/**
 * QUAIS FOTOS TIRAR, por etapa. Existe para o cliente NÃO reimplementar o
 * recorte cumulativo da checklist (regra de ouro): o plano nasce das mesmas
 * funções que a execução usa.
 */
export interface PlanoDeFotos {
  projeto: ProjetoDoPlano;
  /** Todos os itens do projeto, sem recorte de etapa. */
  checklist: ItemDoPlano[];
  /** Um plano por Checkpoint, na ordem da linha (semântica CUMULATIVA). */
  etapas: PlanoDaEtapa[];
  /** O recorte SEM etapa: a checklist inteira agrupada por vista. */
  pecaInteira: PlanoDaEtapa;
}

/* ------------------------------------------------------------------ *
 * Trânsito e histórico da peça
 * Origem: passagens/passagem-registro.service.ts
 *         transformadores/consultas/*.ts
 * ------------------------------------------------------------------ */

export interface PassagemRegistrada {
  id: string;
  createdAt: string;
  observacao: string | null;
}

/**
 * Resumo de conferência nas telas centradas na peça. LEIA `vereditoGeral`
 * JUNTO de `checkpoint`: `conforme` de gate parcial não atesta a peça inteira
 * (gap 14).
 */
export interface ConferenciaResumo {
  id: string;
  vereditoGeral: string | null;
  createdAt: string;
  checkpoint: CheckpointResumo | null;
}

/** Resposta de `POST /passagens/registrar`. */
export interface ResultadoRegistroPassagem {
  passagem: PassagemRegistrada;
  checkpoint: EtapaResumo;
  transformador: TransformadorResumo;
  /** É O DADO DO ALERTA (critério 6 do SPEC); `null` = peça nunca conferida. */
  ultimaConferencia: ConferenciaResumo | null;
}

/** Um evento de trânsito no histórico da peça. */
export interface PassagemResumo {
  id: string;
  createdAt: string;
  observacao: string | null;
  checkpoint: EtapaResumo;
}

/* ------------------------------------------------------------------ *
 * Indicadores (dashboard de linha + auditoria)
 * Origem: conferencias/dto/indicadores.dto.ts
 * ------------------------------------------------------------------ */

/**
 * As contagens por veredito, do jeito que a API as agrega. Aparecem iguais em
 * `IndicadorPorEtapa` e `IndicadorPorCampo`.
 *
 * ATENÇÃO ao somar: `divergentes + naoConferiveis + conformes` pode ser MENOR
 * que o total do grupo. Conferência criada fora da engine (linha crua do CRUD)
 * não tem veredito, e veredito desconhecido é ignorado em vez de cair num balde
 * qualquer — a tela mostra os três como vieram e não inventa o fechamento.
 */
export interface ContagemPorVeredito {
  divergentes: number;
  naoConferiveis: number;
  conformes: number;
}

/** Os números de capa do dashboard. */
export interface TotaisIndicadores extends ContagemPorVeredito {
  /** Conferências existentes, COM ou SEM veredito — o denominador honesto. */
  conferencias: number;
  /** Transformadores cadastrados; conta TODOS, mesmo os fora de `linha`. */
  pecas: number;
  passagens: number;
}

/** Um grupo do "em qual etapa a não conformidade é acusada". */
export interface IndicadorPorEtapa extends ContagemPorVeredito {
  /** `null` = conferências sem checkpoint (peça inteira); vem por último. */
  etapa: EtapaResumo | null;
}

/** Um grupo do "quais campos mais dão problema". */
export interface IndicadorPorCampo extends ContagemPorVeredito {
  /** Nome como a conferência gravou (`serie-placa`, `serie-chumbada-topo`…). */
  campo: string;
}

/** ONDE a peça está: a última passagem (posição é derivada, nunca coluna). */
export interface UltimaPassagemNaLinha {
  checkpoint: CheckpointResumo;
  em: string;
}

/**
 * COMO a peça está: o veredito vigente, exatamente como o banco o guardou.
 * A `etapa` viaja colada nele de propósito — `conforme` de gate parcial não
 * atesta a peça inteira (gap 14), então exibir um sem o outro produz falso OK.
 */
export interface UltimaConferenciaNaLinha {
  /** `null` = linha crua do CRUD, criada sem passar pela engine. */
  veredito: string | null;
  etapa: EtapaResumo | null;
  em: string;
}

/** Uma linha do dashboard: peça × onde está × como está. */
export interface PecaNaLinha {
  transformadorId: string;
  numeroSerie: string;
  /** Pode vir vazio quando a etiqueta não trazia; nunca serve de chave. */
  patrimonio: string | null;
  /** `null` = peça cadastrada por conferência, sem scan em checkpoint algum. */
  ultimaPassagem: UltimaPassagemNaLinha | null;
  /** `null` = nunca conferida. NÃO é "sem problema": é ausência de veredito. */
  ultimaConferencia: UltimaConferenciaNaLinha | null;
}

/**
 * Resposta de `GET /conferencias/indicadores` — a leitura AGREGADA do que a
 * engine já gravou. Tudo aqui chega pronto: a tela não soma, não ordena e não
 * classifica nada (regra de ouro).
 */
export interface Indicadores {
  totais: TotaisIndicadores;
  /** Na ordem da linha; o grupo `etapa: null` fecha a lista. */
  porEtapa: IndicadorPorEtapa[];
  /** ORDEM É CONTRATO: divergentes desc, não conferíveis desc, nome. */
  porCampo: IndicadorPorCampo[];
  /**
   * Passagem mais recente primeiro; peça sem passagem no fim. SEM paginação e
   * com teto no servidor: `totais.pecas` maior que `linha.length` significa
   * corte, e a tela precisa dizer isso.
   */
  linha: PecaNaLinha[];
}

/* ------------------------------------------------------------------ *
 * Entidades cruas do CRUD gerado (só o que as telas leem)
 * ------------------------------------------------------------------ */

export interface Checkpoint {
  id: string;
  codigo: string;
  nome: string;
  ordem: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjetoModelo {
  id: string;
  codigo: string;
  descricao?: string | null;
  /** JSON da checklist como string (gap 5). Prefira `GET /plano-de-fotos`. */
  checklist: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transformador {
  id: string;
  numeroSerie: string;
  patrimonio: string;
  cliente: string;
  pedido?: string | null;
  seq?: string | null;
  descricao?: string | null;
  projetoModelo?: ProjetoModelo | null;
  createdAt: string;
  updatedAt: string;
}

/** Resposta do upload: `POST /fotos-evidencia/upload`. */
export interface FotoEvidenciaEnviada {
  id: string;
  /** Pronta para abrir; sob s3 é assinada e expira em 1 h. */
  url: string;
  fonteFisica: FonteFisica;
  conferenciaId: string | null;
}

/** Envelope das listagens paginadas do boilerplate. */
export interface RespostaPaginada<T> {
  data: T[];
  hasNextPage: boolean;
}

/** Resposta de `POST /auth/email/login`. */
export interface Sessao {
  token: string;
  refreshToken: string;
  tokenExpires: number;
  user: { id: number | string; email: string | null };
}

/* ------------------------------------------------------------------ *
 * Entradas dos endpoints do fluxo
 * ------------------------------------------------------------------ */

/** Teto de fotos por conferência — o mesmo do DTO do backend. */
// Valor ESPELHADO de `backend/src/conferencias/dto/executar-com-fotos.dto.ts`
// (`MAX_FOTOS_POR_CONFERENCIA`, validado por `@ArrayMaxSize`): revisar aqui se
// a API mudar, senão a tela deixa passar um envio que o 422 recusa.
export const MAX_FOTOS_POR_CONFERENCIA = 10;

export interface ExecutarComFotosEntrada {
  /** Texto CRU lido do QR: quem interpreta é a API, nunca o front. */
  payloadQr: string;
  etapaCodigo?: string;
  /** Ausente = padrão da API (0.9). O front NÃO decide limiar. */
  limiarConfianca?: number;
  fotoEvidenciaIds: string[];
}

/** Leitura digitada (modo avançado, sem visão). */
export interface LeituraDigitada {
  campo: string;
  valorLido?: string | null;
  confianca?: number | null;
  regiaoLeitura?: string | null;
  fotoEvidenciaId?: string | null;
  corroboracao?: "confirmada" | "nao-confirmada";
}

export interface ExecutarEntrada {
  payloadQr: string;
  etapaCodigo?: string;
  limiarConfianca?: number;
  leituras: LeituraDigitada[];
}

export interface RegistrarPassagemEntrada {
  payloadQr: string;
  etapaCodigo: string;
  observacao?: string;
}

/* ------------------------------------------------------------------ *
 * Utilidades de leitura (sem regra de negócio)
 * ------------------------------------------------------------------ */

/**
 * Bounding box normalizado (0..1) da leitura na foto, no referencial da imagem
 * JÁ ORIENTADA pelo EXIF — dá para posicionar um destaque direto sobre a `<img>`
 * multiplicando por 100 e usando `%`.
 */
export interface CaixaDeLeitura {
  Left: number;
  Top: number;
  Width: number;
  Height: number;
}

/**
 * Converte o `regiaoLeitura` (JSON em string, como o backend persiste) na caixa
 * tipada. Retorna `null` em qualquer formato inesperado: destaque na imagem é
 * enfeite, nunca pode derrubar a tela do veredito.
 */
export function interpretarRegiaoLeitura(
  regiaoLeitura: string | null | undefined,
): CaixaDeLeitura | null {
  if (!regiaoLeitura) return null;

  try {
    const bruto: unknown = JSON.parse(regiaoLeitura);
    if (typeof bruto !== "object" || bruto === null) return null;

    const caixa = bruto as Record<string, unknown>;
    const numeros = ["Left", "Top", "Width", "Height"].map((chave) =>
      typeof caixa[chave] === "number" ? (caixa[chave] as number) : null,
    );

    if (numeros.some((valor) => valor === null)) return null;

    const [Left, Top, Width, Height] = numeros as number[];
    return { Left, Top, Width, Height };
  } catch {
    return null;
  }
}

/**
 * Normaliza o veredito que chega como `string | null` (releitura e resumos) na
 * união literal. Não decide nada: só reconhece o que a engine gravou; valor
 * desconhecido vira `null` e a tela mostra estado neutro.
 */
export function comoVeredito(valor: string | null | undefined): Veredito | null {
  return VEREDITOS.includes(valor as Veredito) ? (valor as Veredito) : null;
}
