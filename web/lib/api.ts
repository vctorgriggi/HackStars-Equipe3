/**
 * Cliente ÚNICO da API TRAEL.
 *
 * Três decisões que valem para o app inteiro:
 *
 * 1. O NAVEGADOR FALA DIRETO COM O NESTJS. Não existe route handler do Next
 *    fazendo proxy nem regra de negócio (CLAUDE.md: "o Next não é uma segunda
 *    API"). Todo endpoint mora aqui, tipado.
 * 2. O FRONT NÃO DECIDE NADA. Nenhuma função deste arquivo compara campo,
 *    aplica limiar ou deriva veredito — ele transporta o que a API respondeu.
 *    Nem `limiarConfianca` é preenchido por padrão: quem tem o número medido é
 *    a API.
 * 3. ERRO DA API É DADO, NÃO EXCEÇÃO OPACA. Todo erro vira `ErroApi` com
 *    `{ status, codigo, mensagem, detalhe }`: `mensagem` é chão de fábrica
 *    ("essa etapa não existe no sistema"), `detalhe` é o texto cru para
 *    exibir discreto e para o suporte.
 *
 * O token JWT não mora aqui: o `AutenticacaoProvider` registra um GETTER via
 * `configurarClienteApi`, e o token continua vivendo só na memória do React
 * (gap 17 do CLAUDE.md — não é para "melhorar" para localStorage).
 */

import type {
  Checkpoint,
  ConferenciaResumo,
  ExecutarComFotosEntrada,
  ExecutarEntrada,
  FonteFisica,
  FotoEvidenciaEnviada,
  Indicadores,
  LaudoDaConferencia,
  PassagemResumo,
  PlanoDeFotos,
  RegistrarPassagemEntrada,
  ResultadoExecucao,
  ResultadoExecucaoComExtracao,
  ResultadoRegistroPassagem,
  RespostaPaginada,
  Sessao,
  Transformador,
  VereditoConferencia,
} from "./tipos";

/* ------------------------------------------------------------------ *
 * Base da API
 * ------------------------------------------------------------------ */

/**
 * Onde a API está.
 *
 * - `NEXT_PUBLIC_API_URL` vence sempre (é assim que se aponta para produção).
 *   É só URL: NENHUM segredo entra em variável `NEXT_PUBLIC_*`.
 * - Sem ela, deriva do HOST DA PÁGINA na porta 3001 — mesma regra da página
 *   `/demo` servida pela API. É o que faz o celular na rede local funcionar
 *   sem configuração: abriu `http://192.168.0.10:3000`, fala com
 *   `http://192.168.0.10:3001/api/v1`.
 */
export function baseDaApi(): string {
  const configurada = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configurada) return configurada.replace(/\/+$/, "");

  if (typeof window === "undefined") {
    // Render no servidor: não há host de página para derivar. Nenhuma chamada
    // do app acontece aqui (todas partem de componentes cliente), então o
    // caminho relativo só serve para não quebrar a montagem.
    return "/api/v1";
  }

  return `${window.location.protocol}//${window.location.hostname}:3001/api/v1`;
}

/* ------------------------------------------------------------------ *
 * Erros normalizados
 * ------------------------------------------------------------------ */

/**
 * Tradução dos códigos de erro da API para o vocabulário do chão de fábrica.
 *
 * Os códigos vêm por PREFIXO no corpo do Nest
 * (`{ errors: { etapaCodigo: 'etapa-desconhecida: serigrafia' } }`): a parte
 * antes do `:` é o código estável, o resto é detalhe variável.
 *
 * A tela mostra a `mensagem` grande e o `detalhe` pequeno — o operador entende
 * o que fazer, e o time de suporte ainda vê o texto original.
 */
const MENSAGENS: Record<string, string> = {
  // --- fluxo de conferência -----------------------------------------
  "etapa-desconhecida":
    "Esta etapa não existe no sistema. Confira o código da etapa configurado neste aparelho.",
  "etapa-sem-campos-conferiveis":
    "Nesta etapa não há nada a conferir neste modelo de peça — as marcações ainda não foram gravadas.",
  "projeto-modelo-indeterminado":
    "Não deu para saber de qual projeto é esta peça. Informe o código do projeto ou cadastre o modelo.",
  "checklist-invalido":
    "A checklist do projeto desta peça está inválida. Chame o responsável pelo cadastro do modelo.",
  "checklist-sem-campo-avaliavel":
    "A checklist do projeto não tem nenhum campo conferível.",
  "checklist-etapa-desconhecida":
    "A checklist aponta uma etapa que não existe na linha.",
  "conferencia-inexistente": "Esta conferência não existe (ou foi apagada).",
  "laudo-indisponivel":
    "O serviço de redação está indisponível — o veredito acima segue valendo.",
  "campo-conferido-imutavel":
    "Veredito já emitido não pode ser alterado — a trilha de auditoria é imutável. Faça uma nova conferência.",

  // --- QR ------------------------------------------------------------
  "payload-vazio": "O QR veio vazio. Leia a etiqueta de novo.",
  "formato-desconhecido":
    "Não reconheci o formato deste QR. Confira se é a etiqueta da peça e tente de novo.",
  "payload-somente-codigo":
    "Este QR traz só um código de consulta, sem os dados da peça. Digite os dados da etiqueta.",
  "campos-obrigatorios-ausentes":
    "A etiqueta lida não traz número de série e patrimônio.",
  "posicional-numero-serie-ausente":
    "A etiqueta lida não traz o número de série.",
  "posicional-numero-serie-invalido":
    "O número de série lido na etiqueta não parece um identificador válido.",
  "posicional-patrimonio-ausente": "A etiqueta lida não traz o patrimônio.",
  "posicional-patrimonio-invalido":
    "O patrimônio lido na etiqueta não parece um identificador válido.",

  // --- fotos / evidência ---------------------------------------------
  "foto-evidencia-inexistente":
    "Uma das fotos enviadas não existe mais no servidor. Tire a foto de novo.",
  "foto-evidencia-de-outra-conferencia":
    "Esta foto já lastreia outra conferência. Tire uma foto nova para esta.",
  "falha-ao-ler-evidencia":
    "Não consegui ler o arquivo de uma das fotos. Tente enviar de novo.",
  "falha-ao-vincular-evidencia":
    "A conferência saiu, mas uma foto não ficou vinculada a ela.",
  "mime-nao-suportado": "Este tipo de arquivo não é aceito. Envie uma foto.",
  cantUploadFileType: "Este tipo de arquivo não é aceito. Envie uma foto.",
  selectFile: "Nenhuma foto foi selecionada.",

  // --- peça ------------------------------------------------------------
  "transformador-inexistente": "Peça não encontrada.",

  // --- genéricos do boilerplate -----------------------------------------
  notExists: "Um dos registros informados não existe.",
  emailNotExists: "E-mail não cadastrado.",
  incorrectPassword: "Senha incorreta.",
  notFound: "Registro não encontrado.",

  // --- sintéticos do cliente ---------------------------------------------
  "nao-autenticado": "Sessão expirada. Entre de novo para continuar.",
  "sem-rede":
    "Não consegui falar com o servidor. Confira a rede do aparelho e tente de novo.",
  "resposta-invalida": "O servidor respondeu algo que não consegui interpretar.",
  "erro-desconhecido": "Algo deu errado na chamada ao servidor.",
};

/** Tradução de um código, com fallback honesto (nunca inventa explicação). */
export function traduzirCodigo(codigo: string | null): string | null {
  if (!codigo) return null;
  return MENSAGENS[codigo] ?? null;
}

/**
 * Erro de chamada à API, já normalizado.
 *
 * - `status`: HTTP (0 quando a requisição nem saiu — rede/CORS);
 * - `codigo`: o identificador estável (`etapa-desconhecida`, `notExists`…) ou
 *   `null` quando a API não mandou um;
 * - `mensagem`: texto de chão de fábrica, pronto para a tela;
 * - `detalhe`: o texto CRU da API (`HTTP 422 — etapaCodigo: etapa-desconhecida:
 *   serigrafia`), para exibir discreto ao lado.
 */
export class ErroApi extends Error {
  readonly status: number;
  readonly codigo: string | null;
  readonly mensagem: string;
  readonly detalhe: string;
  readonly corpo: unknown;

  constructor(entrada: {
    status: number;
    codigo: string | null;
    mensagem: string;
    detalhe: string;
    corpo?: unknown;
  }) {
    super(entrada.mensagem);
    this.name = "ErroApi";
    this.status = entrada.status;
    this.codigo = entrada.codigo;
    this.mensagem = entrada.mensagem;
    this.detalhe = entrada.detalhe;
    this.corpo = entrada.corpo;
    Object.setPrototypeOf(this, ErroApi.prototype);
  }
}

export function ehErroApi(erro: unknown): erro is ErroApi {
  return erro instanceof ErroApi;
}

/** Achata `{ errors: { a: 'x', b: { c: 'y' } } }` em `['a: x', 'b.c: y']`. */
function achatarErros(valor: unknown, prefixo = ""): string[] {
  if (valor === null || valor === undefined) return [];

  if (typeof valor === "string" || typeof valor === "number") {
    return [`${prefixo}${valor}`];
  }

  if (typeof valor !== "object") return [];

  return Object.entries(valor as Record<string, unknown>).flatMap(
    ([chave, item]) => achatarErros(item, `${prefixo}${chave}: `),
  );
}

/** O código estável é o que vem antes do primeiro `:` do valor do erro. */
function extrairCodigo(valor: unknown): string | null {
  if (typeof valor !== "string") return null;

  const antesDoDoisPontos = valor.split(":")[0]?.trim() ?? "";
  if (!antesDoDoisPontos) return null;

  // Códigos do domínio são kebab-case; os do boilerplate são camelCase soltos
  // (`notExists`, `selectFile`). Frase com espaço é mensagem, não código.
  const ehCodigo = /^[A-Za-z][A-Za-z0-9]*(-[A-Za-z0-9]+)*$/.test(
    antesDoDoisPontos,
  );

  return ehCodigo ? antesDoDoisPontos : null;
}

/**
 * Corpo de erro do Nest → `ErroApi`. Reconhece as duas formas do boilerplate:
 * `{ status, errors: { campo: 'codigo: detalhe' } }` (domínio e validação) e
 * `{ statusCode, message }` (guards, 401).
 */
function normalizarErro(status: number, corpo: unknown): ErroApi {
  const registro =
    typeof corpo === "object" && corpo !== null
      ? (corpo as Record<string, unknown>)
      : {};

  const partes = achatarErros(registro.errors);
  const mensagemSolta =
    typeof registro.message === "string" ? registro.message : null;

  const detalhe = partes.length
    ? `HTTP ${status} — ${partes.join(" | ")}`
    : `HTTP ${status} — ${mensagemSolta ?? "falha na chamada da API"}`;

  // Primeiro erro que tenha um código reconhecível manda na mensagem; senão,
  // o primeiro código qualquer; senão, nenhum.
  const valores = Object.values(
    (typeof registro.errors === "object" && registro.errors !== null
      ? registro.errors
      : {}) as Record<string, unknown>,
  );

  const codigos = valores
    .flatMap((valor) =>
      typeof valor === "object" && valor !== null
        ? Object.values(valor as Record<string, unknown>)
        : [valor],
    )
    .map(extrairCodigo)
    .filter((codigo): codigo is string => codigo !== null);

  const codigo =
    codigos.find((item) => item in MENSAGENS) ??
    codigos[0] ??
    (status === 401 || status === 403 ? "nao-autenticado" : null);

  const mensagem =
    traduzirCodigo(codigo) ??
    (status === 404
      ? "Não encontrei este registro no servidor."
      : status >= 500
        ? "O servidor falhou ao processar. Tente de novo em instantes."
        : (partes[0] ?? mensagemSolta ?? MENSAGENS["erro-desconhecido"]));

  return new ErroApi({ status, codigo, mensagem, detalhe, corpo });
}

/* ------------------------------------------------------------------ *
 * Sessão (token em memória, injetado pelo provider)
 * ------------------------------------------------------------------ */

let obterToken: () => string | null = () => null;
let aoPerderSessao: () => void = () => {};

/**
 * Ligação do cliente com o `AutenticacaoProvider`. O cliente guarda um GETTER,
 * nunca o token — assim o token continua existindo em um lugar só (o estado do
 * React) e some no refresh, como o repositório decidiu.
 */
export function configurarClienteApi(config: {
  obterToken: () => string | null;
  aoPerderSessao?: () => void;
}): void {
  obterToken = config.obterToken;
  if (config.aoPerderSessao) aoPerderSessao = config.aoPerderSessao;
}

/* ------------------------------------------------------------------ *
 * Motor das chamadas
 * ------------------------------------------------------------------ */

interface OpcoesPedido {
  metodo?: "GET" | "POST" | "PATCH" | "DELETE";
  corpo?: unknown;
  /** `false` só no login. */
  autenticar?: boolean;
  parametros?: Record<string, string | number | boolean | undefined>;
  sinal?: AbortSignal;
}

function montarUrl(
  caminho: string,
  parametros?: OpcoesPedido["parametros"],
): string {
  const url = `${baseDaApi()}${caminho}`;
  if (!parametros) return url;

  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === "") continue;
    busca.set(chave, String(valor));
  }

  const query = busca.toString();
  return query ? `${url}?${query}` : url;
}

async function pedir<T>(caminho: string, opcoes: OpcoesPedido = {}): Promise<T> {
  const { metodo = "GET", corpo, autenticar = true, parametros, sinal } = opcoes;

  const cabecalhos: Record<string, string> = { Accept: "application/json" };
  if (corpo !== undefined) cabecalhos["Content-Type"] = "application/json";

  if (autenticar) {
    const token = obterToken();
    if (token) cabecalhos.Authorization = `Bearer ${token}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(montarUrl(caminho, parametros), {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: sinal,
    });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") throw erro;
    throw new ErroApi({
      status: 0,
      codigo: "sem-rede",
      mensagem: MENSAGENS["sem-rede"],
      detalhe: `Falha de rede ao chamar ${metodo} ${caminho} (${baseDaApi()}).`,
      corpo: erro,
    });
  }

  if (resposta.status === 204) return undefined as T;

  const texto = await resposta.text();
  let json: unknown = null;
  if (texto) {
    try {
      json = JSON.parse(texto);
    } catch {
      json = null;
    }
  }

  if (!resposta.ok) {
    const erro = normalizarErro(resposta.status, json ?? { message: texto });
    if (resposta.status === 401) aoPerderSessao();
    throw erro;
  }

  return json as T;
}

/* ------------------------------------------------------------------ *
 * Autenticação
 * ------------------------------------------------------------------ */

/** `POST /auth/email/login`. Devolve o JWT; quem o guarda é o provider. */
export function entrar(entrada: {
  email: string;
  senha: string;
}): Promise<Sessao> {
  return pedir<Sessao>("/auth/email/login", {
    metodo: "POST",
    autenticar: false,
    corpo: { email: entrada.email, password: entrada.senha },
  });
}

/* ------------------------------------------------------------------ *
 * Etapas da linha
 * ------------------------------------------------------------------ */

/**
 * `GET /checkpoints` — as etapas da linha, ordenadas. O `codigo` é o
 * identificador estável (nome e ordem mudam).
 */
export async function listarCheckpoints(
  sinal?: AbortSignal,
): Promise<Checkpoint[]> {
  const resposta = await pedir<RespostaPaginada<Checkpoint>>("/checkpoints", {
    parametros: { page: 1, limit: 50 },
    sinal,
  });

  return [...resposta.data].sort((a, b) => a.ordem - b.ordem);
}

/* ------------------------------------------------------------------ *
 * Conferência
 * ------------------------------------------------------------------ */

/**
 * `GET /conferencias/plano-de-fotos` — QUAIS FOTOS TIRAR por etapa, direto da
 * checklist do projeto. Use SEMPRE isto para montar a tela de captura: refazer
 * o recorte cumulativo no cliente é reimplementar regra da API (proibido).
 */
export function obterPlanoDeFotos(
  entrada: { projeto?: string } = {},
  sinal?: AbortSignal,
): Promise<PlanoDeFotos> {
  return pedir<PlanoDeFotos>("/conferencias/plano-de-fotos", {
    parametros: { projeto: entrada.projeto },
    sinal,
  });
}

/**
 * `POST /conferencias/executar-com-fotos` — o caminho principal do operador.
 * Só aqui a visão roda (créditos AWS são finitos: nada de disparo automático).
 */
export function executarConferenciaComFotos(
  entrada: ExecutarComFotosEntrada,
  sinal?: AbortSignal,
): Promise<ResultadoExecucaoComExtracao> {
  return pedir<ResultadoExecucaoComExtracao>(
    "/conferencias/executar-com-fotos",
    { metodo: "POST", corpo: entrada, sinal },
  );
}

/**
 * `POST /conferencias/executar` — modo AVANÇADO, com leituras digitadas (sem
 * visão). Existe para bancada e ambiente sem AWS; o fluxo do operador é o
 * `executarConferenciaComFotos`.
 */
export function executarConferencia(
  entrada: ExecutarEntrada,
  sinal?: AbortSignal,
): Promise<ResultadoExecucao> {
  return pedir<ResultadoExecucao>("/conferencias/executar", {
    metodo: "POST",
    corpo: entrada,
    sinal,
  });
}

/**
 * `GET /conferencias/:id/campos` — releitura do veredito campo a campo, com as
 * evidências. É como a tela de veredito sobrevive a refresh e ao histórico.
 * Não traz `motivo`, `incoerencias` nem `achadosInconsistentes` (gap 22): esses
 * só existem na resposta do POST.
 */
export function lerVeredito(
  conferenciaId: string,
  sinal?: AbortSignal,
): Promise<VereditoConferencia> {
  return pedir<VereditoConferencia>(
    `/conferencias/${encodeURIComponent(conferenciaId)}/campos`,
    { sinal },
  );
}

/**
 * `POST /conferencias/:id/laudo` — o laudo em prosa da conferência, redigido
 * por IA a partir do veredito que a engine JÁ emitiu.
 *
 * Duas coisas que esta função NÃO faz, e que a tela também não pode fazer:
 *
 * 1. NÃO é fonte de veredito. O texto é redação sobre fatos gravados; se ele
 *    discordar do veredito na tela, quem vale é o veredito (o próprio laudo
 *    termina dizendo isso, e a API garante a frase).
 * 2. NÃO roda sozinha. Cada chamada é uma chamada paga (~US$ 0,01) e só sai no
 *    clique do operador — mesma regra da visão. Nada de `useEffect` disparando
 *    laudo ao abrir a tela.
 *
 * Falha do serviço de redação vem como `laudo-indisponivel` (503) e é isso que
 * a tela mostra: erro explícito, nunca um texto vazio no lugar do laudo.
 */
export function gerarLaudo(
  conferenciaId: string,
  sinal?: AbortSignal,
): Promise<LaudoDaConferencia> {
  return pedir<LaudoDaConferencia>(
    `/conferencias/${encodeURIComponent(conferenciaId)}/laudo`,
    { metodo: "POST", sinal },
  );
}

/**
 * `GET /conferencias/indicadores` — a leitura AGREGADA do que a engine já
 * gravou: totais, divergências por etapa e por campo, e o dashboard de linha.
 *
 * Consulta pura: não escreve, não chama visão (abrir o dashboard não gasta
 * crédito AWS) e não recalcula veredito nenhum — cada número é `COUNT(*)` sobre
 * as colunas que só a engine escreve. Por isso a tela pode exibir tudo direto:
 * agregar no cliente é que seria proibido.
 */
export function obterIndicadores(sinal?: AbortSignal): Promise<Indicadores> {
  return pedir<Indicadores>("/conferencias/indicadores", { sinal });
}

/* ------------------------------------------------------------------ *
 * Fotos de evidência
 * ------------------------------------------------------------------ */

/**
 * `POST /fotos-evidencia/upload` (multipart) — sobe a foto e cria a evidência.
 * NENHUMA chamada de visão acontece aqui; ela só roda no disparo da
 * conferência.
 *
 * Implementado em XHR e não em `fetch` por um motivo prático: foto de celular
 * em rede de fábrica demora, e sem `aoProgredir` o operador acha que travou e
 * dispara de novo (pagando visão duas vezes).
 */
export function enviarFotoEvidencia(entrada: {
  arquivo: File | Blob;
  fonteFisica: FonteFisica;
  conferenciaId?: string;
  aoProgredir?: (fracao: number) => void;
  sinal?: AbortSignal;
}): Promise<FotoEvidenciaEnviada> {
  const { arquivo, fonteFisica, conferenciaId, aoProgredir, sinal } = entrada;

  return new Promise<FotoEvidenciaEnviada>((resolver, rejeitar) => {
    const formulario = new FormData();
    const nome = arquivo instanceof File ? arquivo.name : `${fonteFisica}.jpg`;
    formulario.append("file", arquivo, nome);
    formulario.append("fonteFisica", fonteFisica);
    if (conferenciaId) formulario.append("conferenciaId", conferenciaId);

    const requisicao = new XMLHttpRequest();
    requisicao.open("POST", `${baseDaApi()}/fotos-evidencia/upload`, true);

    const token = obterToken();
    if (token) requisicao.setRequestHeader("Authorization", `Bearer ${token}`);
    requisicao.setRequestHeader("Accept", "application/json");

    if (aoProgredir) {
      requisicao.upload.onprogress = (evento) => {
        if (evento.lengthComputable && evento.total > 0) {
          aoProgredir(evento.loaded / evento.total);
        }
      };
    }

    requisicao.onerror = () =>
      rejeitar(
        new ErroApi({
          status: 0,
          codigo: "sem-rede",
          mensagem: MENSAGENS["sem-rede"],
          detalhe: `Falha de rede ao enviar a foto (${baseDaApi()}).`,
        }),
      );

    requisicao.onabort = () =>
      rejeitar(new DOMException("Envio cancelado", "AbortError"));

    requisicao.onload = () => {
      let json: unknown = null;
      try {
        json = requisicao.responseText ? JSON.parse(requisicao.responseText) : null;
      } catch {
        json = null;
      }

      if (requisicao.status >= 200 && requisicao.status < 300) {
        if (json === null) {
          rejeitar(
            new ErroApi({
              status: requisicao.status,
              codigo: "resposta-invalida",
              mensagem: MENSAGENS["resposta-invalida"],
              detalhe: `HTTP ${requisicao.status} — corpo vazio no upload.`,
            }),
          );
          return;
        }
        resolver(json as FotoEvidenciaEnviada);
        return;
      }

      const erro = normalizarErro(
        requisicao.status,
        json ?? { message: requisicao.responseText },
      );
      if (requisicao.status === 401) aoPerderSessao();
      rejeitar(erro);
    };

    if (sinal) {
      if (sinal.aborted) {
        requisicao.abort();
      } else {
        sinal.addEventListener("abort", () => requisicao.abort(), {
          once: true,
        });
      }
    }

    requisicao.send(formulario);
  });
}

/* ------------------------------------------------------------------ *
 * Trânsito
 * ------------------------------------------------------------------ */

/**
 * `POST /passagens/registrar` — scan do QR no checkpoint. Devolve
 * `ultimaConferencia` junto: é O DADO DO ALERTA (critério 6 do SPEC), sem
 * segunda chamada.
 */
export function registrarPassagem(
  entrada: RegistrarPassagemEntrada,
  sinal?: AbortSignal,
): Promise<ResultadoRegistroPassagem> {
  return pedir<ResultadoRegistroPassagem>("/passagens/registrar", {
    metodo: "POST",
    corpo: entrada,
    sinal,
  });
}

/* ------------------------------------------------------------------ *
 * Peça (busca e histórico)
 * ------------------------------------------------------------------ */

/**
 * `GET /transformadores?numeroSerie=` — a coluna é UNIQUE, então devolve 0 ou 1.
 * É o caminho de "li o QR, quero a peça".
 */
export async function buscarPecaPorNumeroSerie(
  numeroSerie: string,
  sinal?: AbortSignal,
): Promise<Transformador | null> {
  const resposta = await pedir<RespostaPaginada<Transformador>>(
    "/transformadores",
    { parametros: { numeroSerie, page: 1, limit: 1 }, sinal },
  );

  return resposta.data[0] ?? null;
}

/** `GET /transformadores?pedido=` — recorta o lote. */
export function listarPecas(
  entrada: {
    numeroSerie?: string;
    pedido?: string;
    page?: number;
    limit?: number;
  } = {},
  sinal?: AbortSignal,
): Promise<RespostaPaginada<Transformador>> {
  return pedir<RespostaPaginada<Transformador>>("/transformadores", {
    parametros: {
      numeroSerie: entrada.numeroSerie,
      pedido: entrada.pedido,
      page: entrada.page ?? 1,
      limit: entrada.limit ?? 20,
    },
    sinal,
  });
}

/**
 * `GET /transformadores/:id/passagens` — histórico de trânsito em ordem
 * CRONOLÓGICA (mais antiga primeiro; critério 5 do SPEC). Peça inexistente é
 * 404, nunca lista vazia.
 */
export async function historicoDePassagens(
  transformadorId: string,
  entrada: { page?: number; limit?: number } = {},
  sinal?: AbortSignal,
): Promise<RespostaPaginada<PassagemResumo>> {
  return pedir<RespostaPaginada<PassagemResumo>>(
    `/transformadores/${encodeURIComponent(transformadorId)}/passagens`,
    {
      parametros: { page: entrada.page ?? 1, limit: entrada.limit ?? 50 },
      sinal,
    },
  );
}

/**
 * `GET /transformadores/:id/conferencias` — da mais RECENTE para a mais antiga:
 * a primeira é o veredito vigente (fonte do alerta fora da tela de veredito).
 * Lista simples, sem envelope de paginação.
 */
export function historicoDeConferencias(
  transformadorId: string,
  entrada: { limit?: number } = {},
  sinal?: AbortSignal,
): Promise<ConferenciaResumo[]> {
  return pedir<ConferenciaResumo[]>(
    `/transformadores/${encodeURIComponent(transformadorId)}/conferencias`,
    { parametros: { limit: entrada.limit ?? 20 }, sinal },
  );
}
