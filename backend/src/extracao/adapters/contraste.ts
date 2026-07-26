import { TipoDeMarcacao } from '../ports/marcacao';

/**
 * DISCRIMINACAO TINTA x RELEVO POR CONTRASTE — a segunda evidencia que faltava
 * para a vista que declara DUAS marcacoes numericas.
 *
 * O PROBLEMA (medido, docs/visao-ocr.md): a vista `topo` da peca da TRAEL pede
 * `serie-chumbada-topo` (relevo metalico) E `patrimonio-serigrafia-topo` (tinta
 * preta). Quando o OCR devolve UM numero so, a heuristica de
 * `textract.extractor.ts` se recusa a adivinhar de qual dos dois ele e — e
 * devolve os DOIS campos nulos. Essa recusa e correta e foi conquistada de
 * proposito (antes ela casava o patrimonio em tinta com o campo da serie
 * chumbada e acusava peca correta), mas custa cobertura: some um dos 3 irmaos
 * da serie e um dos 2 patrimonios.
 *
 * A IDEIA: a diferenca entre as duas marcacoes e FISICA e mensuravel, e o
 * bounding box que o Textract ja devolve diz onde medir.
 *   - PATRIMONIO SERIGRAFADO e tinta preta sobre o tanque claro: os pixels
 *     escuros do numero ficam MUITO abaixo do fundo em volta;
 *   - SERIE CHUMBADA e relevo da MESMA COR do tanque: o unico sinal e a sombra
 *     suave do baixo-relevo, entao dentro e fora tem quase a mesma luminancia;
 *   - a PLACA e um terceiro caso — texto CLARO sobre fundo PRETO —, e por isso
 *     tem classe propria: sem ela, o numero de serie da placa que aparece de
 *     relance numa foto de vista seria confundido com tinta sobre metal.
 *
 * Nada disso exige modelo treinado nem chamada AWS a mais: e aritmetica sobre
 * bytes que ja estao na memoria.
 *
 * ESTE ARQUIVO E PURO (zero I/O, zero sharp, zero SDK), no mesmo espirito de
 * `interpretarBlocos` e da engine de conformidade: a regra que decide o que a
 * visao afirma tem de ser exercitavel sem AWS e sem lib nativa. Quem le pixel e
 * `recorte.ts`; quem julga e este arquivo.
 */

/** Resumo de luminancia (0..255) de uma regiao de pixels. */
export interface ResumoLuminancia {
  pixels: number;
  media: number;
  desvio: number;
  /** Percentis: p10 pega o traco escuro, p90 o traco claro, p50 o fundo. */
  p10: number;
  p50: number;
  p90: number;
}

/**
 * A regiao do bounding box (`dentro`) e o entorno imediato dela (`anel`).
 *
 * O ANEL E O QUE TORNA A MEDIDA COMPARAVEL: luminancia absoluta nao diz nada —
 * a mesma tinta preta sai a 40 na sombra e a 120 no sol. O que nao muda com a
 * luz e a RELACAO entre a marcacao e o metal ao lado dela.
 */
export interface EstatisticasDeRegiao {
  dentro: ResumoLuminancia;
  anel: ResumoLuminancia;
}

/**
 * Como a marcacao aparece na foto. NAO e veredito nem leitura: e so a resposta
 * de "esta mancha e tinta, relevo ou texto claro sobre fundo escuro?".
 */
export type ClasseDeContraste =
  | 'tinta'
  | 'relevo'
  | 'claro-sobre-escuro'
  | 'indeterminado';

/**
 * CALIBRACAO — numeros medidos em 2026-07-26 sobre as fotos reais de
 * `fotos-demo/` (`npx ts-node -r tsconfig-paths/register
 * scripts/spike-contraste.ts <dir-fotos>` reexecuta e reimprime a tabela).
 * Anel de 1,0 altura do bounding box em cada lado.
 *
 * | foto                | marcacao                     | escuridao | claridade | desvio | px     |
 * | ------------------- | ---------------------------- | --------- | --------- | ------ | ------ |
 * | TOPO-2              | 847233 chumbado (RELEVO)     |     0,114 |     0,122 |   23,1 |  28560 |
 * | DIAGONAL-TRAS-DIR-2 | 847233 chumbado (RELEVO)     |     0,059 |     0,047 |   11,3 |   6930 |
 * | LATERAL-DIREITA-2   | 847233 chumbado (RELEVO)     |     0,031 |     0,075 |   12,6 |   4698 |
 * | FRENTE-2            | 251328 serigrafia (TINTA)    |     0,608 |     0,008 |   68,0 | 135339 |
 * | ETIQUETA-1          | 847233 etiqueta (TINTA)      |     0,600 |     0,047 |   57,0 |  64293 |
 * | TOPO-2              | '10 kVA 251328' (TINTA)      |     0,588 |     0,035 |   55,8 | 445047 |
 * | LATERAL-DIREITA-2   | 847233 etiqueta (TINTA)      |     0,502 |     0,055 |   55,7 |    533 |
 * | PLACA-4             | 847833 placa (CLARO/ESCURO)  |     0,051 |     0,722 |   79,5 |  10800 |
 * | DIAGONAL-TRAS-DIR-2 | 847833 placa (CLARO/ESCURO)  |     0,035 |     0,510 |   53,8 |    594 |
 * | LATERAL-DIREITA-2   | 847833 placa (CLARO/ESCURO)  |     0,043 |     0,290 |   32,2 |    851 |
 *
 * AS CLASSES NAO SE TOCAM, e a folga e grande:
 *   escuridao: RELEVO ate 0,114 · vazio · TINTA a partir de 0,502 (4,4x);
 *   claridade: RELEVO ate 0,122 · vazio · CLARO a partir de 0,290 (2,4x);
 *   textura:   regiao chapada 1,3 · vazio · RELEVO a partir de 11,3 (8,7x).
 *
 * Os limiares abaixo ficam DENTRO dos vazios, com faixa morta declarada entre
 * eles — quem cair nela sai `indeterminado`, e indeterminado nao resolve campo
 * nenhum. Exemplo real de indeterminado medido: o `TPD-408138` da etiqueta na
 * foto diagonal (escuridao 0,353 E claridade 0,224 — escuro e claro ao mesmo
 * tempo, porque o bounding box pega texto e borda de etiqueta juntos).
 */
const LIMIAR_ESCURIDAO_TINTA = 0.3;
const TETO_ESCURIDAO_RELEVO = 0.2;
const LIMIAR_CLARIDADE_CLARO = 0.22;
const TETO_CLARIDADE_RELEVO = 0.18;

/**
 * Regiao menor que isto nao e amostra: percentil de meia duzia de pixels e
 * ruido. A menor marcacao medida nas fotos reais tem 533 px (o `847233` da
 * etiqueta visto de longe, na lateral), entao 256 deixa folga de 2x.
 */
const MINIMO_DE_PIXELS = 256;

/**
 * TEXTURA MINIMA PARA AFIRMAR "RELEVO" — a guarda mais importante deste
 * arquivo, e ela existe por causa de um bug REAL.
 *
 * Relevo e a classe de baixo contraste: dentro ~ fora. O problema e que uma
 * regiao VAZIA (ceu, chapa lisa, ou o bounding box caindo no lugar errado por
 * erro de coordenada) tem exatamente a mesma assinatura — e sem esta guarda um
 * recorte deslocado viraria "relevo" com toda a confianca do mundo.
 *
 * Medido: o `847833` da placa recortado no referencial ERRADO (a armadilha de
 * EXIF documentada em `recorte.ts`) deu desvio 1,3 — regiao chapada. As tres
 * series chumbadas reais deram 11,3 · 12,6 · 23,1. O piso fica em 5,0: quase
 * 4x o ruido de uma regiao vazia e menos da metade do relevo mais fraco.
 *
 * FALHA SEGURA: regiao lisa demais sai `indeterminado`, e indeterminado nao
 * casa com alvo nenhum — o campo continua nulo, que e o comportamento de hoje.
 */
const MINIMO_DE_TEXTURA_RELEVO = 5;

/**
 * Um histograma de 256 baldes (luminancia 0..255). E a forma que `recorte.ts`
 * usa para nao materializar milhoes de pixels em array de `number`.
 */
export type Histograma = ArrayLike<number>;

/** Histograma de uma amostra qualquer — atalho para teste e uso simples. */
export function histogramaDe(pixels: ArrayLike<number>): Uint32Array {
  const baldes = new Uint32Array(256);
  for (let i = 0; i < pixels.length; i++) {
    baldes[pixels[i] & 0xff] += 1;
  }
  return baldes;
}

/** Histograma -> resumo. Funcao PURA; exata (luminancia e discreta em 0..255). */
export function resumirHistograma(baldes: Histograma): ResumoLuminancia {
  let pixels = 0;
  let soma = 0;
  let somaQuadrados = 0;

  for (let valor = 0; valor < 256; valor++) {
    const quantos = baldes[valor] ?? 0;
    pixels += quantos;
    soma += valor * quantos;
    somaQuadrados += valor * valor * quantos;
  }

  if (pixels === 0) {
    return { pixels: 0, media: 0, desvio: 0, p10: 0, p50: 0, p90: 0 };
  }

  const media = soma / pixels;
  // Variancia nunca negativa: erro de ponto flutuante pode empurrar o
  // subtraendo um fio acima, e Math.sqrt de negativo devolveria NaN — que
  // passaria despercebido por toda comparacao aqui embaixo.
  const variancia = Math.max(0, somaQuadrados / pixels - media * media);

  const percentil = (fracao: number): number => {
    const alvo = fracao * pixels;
    let acumulado = 0;
    for (let valor = 0; valor < 256; valor++) {
      acumulado += baldes[valor] ?? 0;
      if (acumulado >= alvo) {
        return valor;
      }
    }
    return 255;
  };

  return {
    pixels,
    media,
    desvio: Math.sqrt(variancia),
    p10: percentil(0.1),
    p50: percentil(0.5),
    p90: percentil(0.9),
  };
}

/**
 * Quanto o traco mais ESCURO da regiao esta abaixo do fundo em volta (0..1).
 * Tinta preta sobre metal claro dispara isto.
 */
export function escuridaoRelativa(estatisticas: EstatisticasDeRegiao): number {
  return (estatisticas.anel.p50 - estatisticas.dentro.p10) / 255;
}

/**
 * Quanto o traco mais CLARO da regiao esta acima do fundo em volta (0..1).
 * Texto branco sobre placa preta dispara isto.
 */
export function claridadeRelativa(estatisticas: EstatisticasDeRegiao): number {
  return (estatisticas.dentro.p90 - estatisticas.anel.p50) / 255;
}

/**
 * A classificacao. Funcao PURA de estatisticas -> classe.
 *
 * ORDEM DAS GUARDAS, e por que ela e esta:
 * 1. amostra pequena demais -> `indeterminado` (nao ha o que medir);
 * 2. escuro E claro ao mesmo tempo -> `indeterminado`. A regiao tem tinta E
 *    fundo preto (bounding box cobrindo duas marcacoes, ou marcacao em cima de
 *    borda). Evidencia contraditoria nao decide nada;
 * 3. so escuro -> `tinta`; so claro -> `claro-sobre-escuro`;
 * 4. baixo contraste nos DOIS sentidos e COM textura -> `relevo`;
 * 5. qualquer outra coisa (faixa morta, regiao chapada) -> `indeterminado`.
 *
 * O QUE ESTA FUNCAO NUNCA FAZ: olhar o VALOR lido, o campo alvo, a confianca do
 * OCR ou o valor esperado do QR. Ela responde uma pergunta de fisica sobre
 * pixels, e responde igual para peca boa e peca defeituosa — e por isso ela nao
 * consegue ser cumplice de um falso `conforme`.
 */
export function classificarMarcacao(
  estatisticas: EstatisticasDeRegiao,
): ClasseDeContraste {
  if (
    estatisticas.dentro.pixels < MINIMO_DE_PIXELS ||
    estatisticas.anel.pixels < MINIMO_DE_PIXELS
  ) {
    return 'indeterminado';
  }

  const escuridao = escuridaoRelativa(estatisticas);
  const claridade = claridadeRelativa(estatisticas);

  const pareceTinta = escuridao >= LIMIAR_ESCURIDAO_TINTA;
  const pareceClaro = claridade >= LIMIAR_CLARIDADE_CLARO;

  if (pareceTinta && pareceClaro) {
    return 'indeterminado';
  }
  if (pareceTinta) {
    return 'tinta';
  }
  if (pareceClaro) {
    return 'claro-sobre-escuro';
  }

  const baixoContraste =
    escuridao <= TETO_ESCURIDAO_RELEVO && claridade <= TETO_CLARIDADE_RELEVO;

  return baixoContraste &&
    estatisticas.dentro.desvio >= MINIMO_DE_TEXTURA_RELEVO
    ? 'relevo'
    : 'indeterminado';
}

/**
 * A medicao CONCLUIU alguma coisa sobre TODOS os numeros em disputa?
 *
 * E a fronteira entre dois estados que parecem iguais e nao sao:
 *
 * - AUSENCIA DE EVIDENCIA (`indeterminado`, ou ninguem mediu): a foto pode ser
 *   lisa demais, a lib de imagem pode faltar, a regiao pode ser pequena. Nao se
 *   aprendeu nada, entao nao se pode PERDER nada — quem chama volta para a
 *   regra anterior, exatamente como se o contraste nao existisse;
 * - EVIDENCIA CONTRARIA (classe decisiva que nao casa com nenhum alvo): a foto
 *   respondeu, e a resposta foi "este numero nao e desta marcacao". Ai a regra
 *   antiga fica proibida: seguir com ela seria ignorar medicao paga.
 *
 * Sem esta distincao, uma foto sem textura zeraria leituras boas — o contrario
 * do que a discriminacao por contraste existe para fazer.
 */
export function medicaoConclusiva(classes: ClasseDeContraste[]): boolean {
  return (
    classes.length > 0 && classes.every((classe) => classe !== 'indeterminado')
  );
}

/** Alvo pendente com o tipo de marcacao que a checklist espera nele. */
export interface AlvoTipado {
  campo: string;
  tipo: TipoDeMarcacao;
}

/** Candidato de leitura ja medido. `chave` identifica a leitura para quem chamou. */
export interface CandidatoClassificado {
  chave: string;
  classe: ClasseDeContraste;
}

/** Um casamento aprovado: este campo recebe a leitura desta chave. */
export interface ParPorContraste {
  campo: string;
  chave: string;
}

/** Classes que uma marcacao esperada pode assumir na foto. */
const CLASSE_DO_TIPO: Record<
  Exclude<TipoDeMarcacao, 'indefinido'>,
  ClasseDeContraste
> = {
  relevo: 'relevo',
  tinta: 'tinta',
};

/**
 * CASAMENTO POR TIPO — pura, e deliberadamente covarde.
 *
 * So devolve par quando a evidencia e DECISIVA, e "decisiva" aqui tem tres
 * exigencias cumulativas:
 *
 * 1. NENHUM candidato `indeterminado` no conjunto. Um numero que nao deu para
 *    medir e um numero que pode ser de qualquer alvo; deixa-lo de lado e
 *    resolver os outros seria escolher entre duas hipoteses vivas — exatamente
 *    o chute que esta heuristica existe para nao dar;
 * 2. EXATAMENTE UM alvo pendente espera aquele tipo. Dois campos de relevo
 *    pendentes na mesma vista sao indistinguiveis por contraste (a fisica e a
 *    mesma), e a posicao nao desempata sozinha;
 * 3. EXATAMENTE UM candidato foi classificado naquela classe.
 *
 * Falhando qualquer uma, o tipo simplesmente nao produz par e os campos
 * continuam nulos — o comportamento de hoje, que a engine le como
 * `nao_conferivel`.
 *
 * `claro-sobre-escuro` nunca casa com nada de proposito. Ele existe para
 * EXCLUIR: o `serie-placa` que aparece de relance numa foto de vista (medido em
 * LATERAL-DIREITA-2 e DIAGONAL-TRASEIRA-DIREITA-2) fica marcado como "isto e da
 * placa" e para de concorrer com a serie chumbada. Casar campo de placa por
 * contraste seria amarrar a regra a UM modelo de placa — a da TRAEL e preta com
 * texto claro, mas placa clara com texto preto existe —, e a placa ja resolve
 * por rotulo (`N°`/`PATRIMONIO`), que e evidencia melhor.
 *
 * POR QUE ISTO NAO ABRE CAMINHO PARA FALSO `conforme` (o argumento adversarial,
 * por escrito porque e o invariante do projeto):
 *
 * a) uma classificacao ERRADA troca a leitura de campo. Para virar `conforme`,
 *    o valor entregue teria de ser IGUAL ao esperado daquele campo — ou seja, o
 *    numero da serie teria de ser igual ao do patrimonio. Se forem diferentes
 *    (o caso normal), o erro produz `divergente` ou `nao_conferivel`, nunca
 *    aprovacao;
 * b) e se forem iguais? Ai as duas marcacoes deveriam mostrar o mesmo numero de
 *    qualquer jeito, e o `conforme` esta correto por acidente feliz;
 * c) o caso vizinho — leitura que bate com o esperado de OUTRO campo — ja e
 *    barrado antes do veredito por `leitura-de-outro-campo`
 *    (`conferencias/conferencia-execucao.service.ts`), que rebaixa para
 *    `nao_conferivel`;
 * d) campo em relevo ainda precisa passar pela corroboracao por recorte para
 *    ser ACUSADO, e por confianca >= limiar para ser aprovado. Este casamento
 *    escolhe QUAL campo recebe a leitura; ele nao mexe em valor, confianca nem
 *    veredito, e nao remove guarda nenhuma;
 * e) o pior caso realista e o oposto do falso OK: classificar mal manda uma
 *    leitura boa para o campo errado e a peca sai `divergente`/`nao_conferivel`
 *    — barrada. Caro, e seguro.
 */
export function casarPorContraste(
  alvos: AlvoTipado[],
  candidatos: CandidatoClassificado[],
): ParPorContraste[] {
  if (candidatos.some((candidato) => candidato.classe === 'indeterminado')) {
    return [];
  }

  const pares: ParPorContraste[] = [];

  for (const tipo of ['relevo', 'tinta'] as const) {
    const alvosDoTipo = alvos.filter((alvo) => alvo.tipo === tipo);
    const candidatosDaClasse = candidatos.filter(
      (candidato) => candidato.classe === CLASSE_DO_TIPO[tipo],
    );

    if (alvosDoTipo.length !== 1 || candidatosDaClasse.length !== 1) {
      continue;
    }

    pares.push({
      campo: alvosDoTipo[0].campo,
      chave: candidatosDaClasse[0].chave,
    });
  }

  return pares;
}
