import { normalizar, temConteudo } from './normalizacao';
import {
  IncoerenciaEntreCampos,
  LeituraDoGrupo,
  MotivoCampo,
  ResultadoCampo,
} from './tipos';

// Conferencia de COERENCIA ENTRE CAMPOS IRMAOS. Funcao pura, derivada do
// resultado por campo — nao repete comparacao, nao toca I/O, nao entra no laco
// da engine.
//
// POR QUE EXISTE: o numero de serie e gravado 3x no metal DE PROPOSITO, mais
// uma vez na placa. E redundancia fisica da fabrica, e ate hoje o sistema a
// desperdicava: cada posicao era julgada isolada contra o QR e a informacao
// "as posicoes discordam ENTRE SI" se perdia.
//
// Caso medido em 2026-07-25: numa foto lateral o Textract leu 847833 onde a
// peca diz 847233 (erro de digito, 84,6% de confianca); as outras duas
// posicoes leram 847233 a 98,8%. Um humano olha as tres leituras e sabe na
// hora qual re-inspecionar. Com limiar 0.9 o campo ja saia `nao_conferivel`
// ("foto ruim"), mas ninguem ficava sabendo que ele tinha lido OUTRO NUMERO —
// que e a diferenca entre "tire a foto de novo" e "va olhar aquela posicao".

/**
 * Motivos que TIRAM a leitura da comparacao entre irmaos.
 *
 * PRECEDENCIA (explicita, por pedido do desenho): `leituras-conflitantes`
 * (dedupe) e `leitura-de-outro-campo` (troca de campo) VENCEM a coerencia.
 * Os dois significam a mesma coisa no fundo — "esta leitura nao e uma
 * afirmacao confiavel SOBRE ESTA POSICAO":
 *
 * - `leitura-de-outro-campo` (`trocado`): o texto lido bate exatamente com o
 *   esperado de OUTRO campo, sinal de que a foto mostrava mais de uma marcacao
 *   e o extrator casou a errada. Compara-lo com as irmas produziria uma
 *   discordancia fantasma sobre uma peca correta, e pior: mandaria o operador
 *   re-inspecionar uma posicao que esta certa.
 * - `leituras-conflitantes` (`conflitante`): DUAS leituras validas do mesmo
 *   campo ja discordaram entre si; a que sobreviveu ao dedupe e a de maior
 *   confianca. Usa-la aqui faria a incoerencia depender de qual leitura venceu
 *   o desempate — alarme nao determinista, que e alarme que ninguem confia.
 *
 * Excluir e SEGURO porque as duas guardas ja forcam `nao_conferivel` no campo:
 * a exclusao nunca promove nada, so evita ruido. Campo obrigatorio nessa
 * situacao continua bloqueando o veredito geral pela regra de sempre.
 *
 * O que NAO exclui: confianca abaixo do limiar. Uma leitura fraca ainda e uma
 * afirmacao sobre esta posicao — e justamente o caso medido acima. A confianca
 * viaja na resposta para o humano pesar; ela nao filtra a comparacao.
 */
const MOTIVOS_FORA_DA_COMPARACAO: readonly MotivoCampo[] = [
  'leituras-conflitantes',
  'leitura-de-outro-campo',
];

function participaDaComparacao(campo: ResultadoCampo): boolean {
  // Ausencia NUNCA e discordancia: campo sem leitura (ou com leitura vazia)
  // fica de fora. Ele ja e `nao_conferivel` por conta propria, e conta-lo como
  // divergencia entre irmas transformaria "nao fotografei essa posicao" em
  // alarme de peca errada.
  if (!temConteudo(campo.valorLido)) {
    return false;
  }

  return (
    campo.motivo === undefined ||
    !MOTIVOS_FORA_DA_COMPARACAO.includes(campo.motivo)
  );
}

function paraLeituraDoGrupo(campo: ResultadoCampo): LeituraDoGrupo {
  return {
    campo: campo.campo,
    fonteFisica: campo.fonteFisica,
    valorLido: campo.valorLido as string,
    confianca: campo.confianca,
    veredito: campo.veredito,
  };
}

/**
 * Descobre os grupos de irmaos e devolve os que nao concordam entre si.
 *
 * COMO O GRUPO E DESCOBERTO — por VALOR ESPERADO IDENTICO (normalizado), nunca
 * por lista em codigo:
 *
 * Irmao, por definicao de dominio, e o campo que tem de carregar o MESMO
 * numero. Quem diz isso e o valor esperado que o QR injetou naquele campo, que
 * ja e entrada da engine. Consequencias praticas, todas de graca:
 *   - modelo com 2 ou com 4 chumbados funciona sem tocar codigo (a checklist e
 *     dado);
 *   - cliente que nomeia os campos de outro jeito funciona igual;
 *   - patrimonio agrupa com patrimonio pelo mesmo mecanismo;
 *   - campo sem valor esperado nao entra em grupo nenhum — sem esperado nao ha
 *     o que ser irmao de que.
 *
 * Alternativas descartadas:
 *   - PREFIXO do nome (`serie-*`): amarraria a regra a uma convencao de
 *     nomenclatura de UM cliente, duplicando conhecimento que ja vive em
 *     `ORIGENS_DO_ESPERADO`, e agruparia errado dois campos de mesmo prefixo
 *     com esperados diferentes.
 *   - DECLARACAO na checklist (`grupo: 'serie'`): mais explicito, mas so
 *     funcionaria para checklist anotada — a seedada hoje nao e, e a regra
 *     falharia CALADA em todo dado existente. Checklist e varchar sem validacao
 *     estrutural (gap 5), entao o esquecimento nem apareceria. Se um dia
 *     existir modelo em que dois campos de mesmo esperado NAO sao redundantes,
 *     a declaracao entra como excecao por cima deste padrao.
 *
 * Colisao benigna: se a peca tiver numeroSerie igual ao patrimonio, serie e
 * patrimonio caem no mesmo grupo — e continua correto, porque nesse caso todas
 * as marcacoes realmente deveriam mostrar o mesmo numero.
 *
 * O QUE ESTA FUNCAO NUNCA FAZ: eleger uma leitura "vencedora", contar votos,
 * reescrever veredito de campo ou transformar concordancia em `conforme`. Duas
 * posicoes concordando NAO aprovam a terceira — as duas podem estar gravadas
 * erradas juntas, e a regra de ouro proibe que uma peca fique conforme por
 * maioria. Coerencia so acusa; quem julga campo continua sendo `conferir`.
 */
export function detectarIncoerencias(
  campos: ResultadoCampo[],
): IncoerenciaEntreCampos[] {
  const grupos = new Map<string, ResultadoCampo[]>();

  for (const campo of campos) {
    if (!temConteudo(campo.valorEsperado)) {
      continue;
    }

    // Mesma normalizacao da comparacao da engine: sem isso '847233' e
    // ' 847233' virariam grupos diferentes e a incoerencia sumiria.
    const chave = normalizar(campo.valorEsperado);
    const grupo = grupos.get(chave);
    if (grupo) {
      grupo.push(campo);
    } else {
      grupos.set(chave, [campo]);
    }
  }

  const incoerencias: IncoerenciaEntreCampos[] = [];

  // Ordem de insercao do Map = ordem da checklist: resposta deterministica.
  for (const membros of grupos.values()) {
    // Campo sozinho no grupo nao tem irmao com quem discordar. A redundancia e
    // que gera o sinal; sem ela, so resta a comparacao contra o QR, que a
    // engine ja fez.
    if (membros.length < 2) {
      continue;
    }

    const participantes = membros.filter(participaDaComparacao);
    if (participantes.length < 2) {
      continue;
    }

    const valoresLidos: string[] = [];
    const vistos = new Set<string>();
    for (const participante of participantes) {
      const normalizado = normalizar(participante.valorLido as string);
      if (vistos.has(normalizado)) {
        continue;
      }
      vistos.add(normalizado);
      // Valor CRU da primeira ocorrencia: e o que o operador compara com a
      // peca (mesmo criterio do cruzamento de achados livres).
      valoresLidos.push(participante.valorLido as string);
    }

    // Um valor so = grupo coerente. Nada a reportar (e, de novo: coerente NAO
    // quer dizer conforme — o veredito de cada campo ja saiu na engine).
    if (valoresLidos.length < 2) {
      continue;
    }

    incoerencias.push({
      // Todos os membros tem o mesmo esperado normalizado; o cru do primeiro
      // representa o grupo.
      valorEsperado: membros[0].valorEsperado as string,
      campos: participantes.map((participante) => participante.campo),
      valoresLidos,
      leituras: participantes.map(paraLeituraDoGrupo),
    });
  }

  return incoerencias;
}
