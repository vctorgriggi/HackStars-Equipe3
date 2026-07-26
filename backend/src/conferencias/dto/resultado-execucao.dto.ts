import { ApiProperty } from '@nestjs/swagger';

import {
  IncoerenciaEntreCampos,
  LeituraDoGrupo,
  MotivoCampo,
  ResultadoCampo,
  Veredito,
} from '../engine/tipos';
import {
  CheckpointResumo,
  EtapaResumo,
  TransformadorResumo,
} from './resumos-compartilhados.dto';

/**
 * Resposta de `POST /conferencias/executar` como CLASSE, para o Swagger
 * conseguir documentá-la (interface some na compilação e o front receberia a
 * rota com schema de resposta vazio — justamente a rota principal do fluxo).
 *
 * A equivalência com os tipos da ENGINE é garantida pelo TypeScript, não por
 * disciplina: `implements` obriga a classe a ter tudo que a interface tem, e
 * os pontos de atribuição em `ConferenciaExecucaoService.executar` (que recebe
 * valores tipados pela engine) obrigam o contrário. `EQUIVALENCIA_COM_A_ENGINE`
 * abaixo torna as duas direções explícitas.
 *
 * Por que a engine não virou classe: `engine/tipos.ts` é lógica pura, sem
 * import de framework (regra de ouro do CLAUDE.md) — pôr `@nestjs/swagger` lá
 * dentro trocaria a pureza da engine por conveniência de documentação.
 */

/** Os três estados de veredito, na ordem de precedência do agregado. */
export const VEREDITOS: Veredito[] = [
  'divergente',
  'nao_conferivel',
  'conforme',
];

/** A união literal COMPLETA de `MotivoCampo` (engine/tipos.ts). */
export const MOTIVOS_CAMPO: MotivoCampo[] = [
  'sem-valor-esperado',
  'sem-leitura',
  'leituras-conflitantes',
  'leitura-de-outro-campo',
  'confianca-abaixo-do-limiar',
  'leitura-nao-corroborada',
];

const DESCRICAO_VEREDITO_CAMPO =
  'Veredito DESTE campo, como a engine decidiu — o front nunca recalcula. ' +
  '`conforme`: valor lido igual ao esperado do QR, com confiança >= limiar. ' +
  '`divergente`: leitura com lastro e DIFERENTE do esperado (a peça está ' +
  'gravada errada). `nao_conferivel`: não dá para afirmar nada sobre o campo ' +
  '— o porquê vem em `motivo`. Campo ilegível NUNCA é rebaixado para ' +
  '`conforme`: o falso OK é a não conformidade que chega ao cliente.';

const DESCRICAO_VEREDITO_GERAL =
  'Veredito da conferência inteira, agregado pela engine na precedência ' +
  '`divergente` > `nao_conferivel` > `conforme`: basta UM campo divergente ' +
  'para o geral ser `divergente`; sem divergência, basta um campo ' +
  'OBRIGATÓRIO não conferível (ou uma incoerência entre campos irmãos) para ' +
  'ser `nao_conferivel`; `conforme` só quando todos os campos avaliados estão ' +
  'conformes. Campo OPCIONAL não conferível não bloqueia o conforme ' +
  '(critério 4 do SPEC). Atenção: com `etapaAvaliada` preenchida este veredito ' +
  'cobre apenas o recorte daquela etapa — não atesta a peça inteira.';

const DESCRICAO_MOTIVO =
  'Por que o campo não pôde ser afirmado. Só vem com `nao_conferivel`; ' +
  'ausente em `conforme`/`divergente`. É o dado que separa "reenquadre a ' +
  'foto" de "a peça está gravada errada":\n' +
  '- `sem-valor-esperado`: o QR não traz esse dado (ex.: potência) — não há o ' +
  'que comparar; não é defeito da peça nem da foto.\n' +
  '- `sem-leitura`: a visão não devolveu valor nenhum para o campo — ' +
  'refotografe a vista com a marcação inteira no quadro.\n' +
  '- `leituras-conflitantes`: duas leituras válidas do MESMO campo discordaram ' +
  'entre si e nenhuma foi eleita (eleger calado poderia aprovar peça errada) ' +
  '— refotografe.\n' +
  '- `leitura-de-outro-campo`: o valor lido bate exatamente com o esperado de ' +
  'OUTRO campo (ver `campoDaLeitura`) — a foto pegou a marcação vizinha; ' +
  'reenquadre isolando a marcação pedida.\n' +
  '- `confianca-abaixo-do-limiar`: houve leitura, mas com score abaixo do ' +
  'limiar (padrão 0.9) — foto ruim de ângulo, luz ou foco; refotografe.\n' +
  '- `leitura-nao-corroborada`: marcação em RELEVO (série chumbada) lida uma ' +
  'vez só, sem segunda evidência concordante. A regra "antes de acusar, ' +
  'confirme" proíbe acusar a peça com uma leitura só — refotografe a posição ' +
  '(e as irmãs) antes de tratar como divergência.';

/** Uma leitura que participou da comparação entre campos irmãos. */
export class LeituraDoGrupoResposta implements LeituraDoGrupo {
  @ApiProperty({ type: String, example: 'serie-placa' })
  campo: string;

  @ApiProperty({
    type: String,
    example: 'placa',
    description: 'Vista da peça de onde a leitura saiu.',
  })
  fonteFisica: string;

  @ApiProperty({
    type: String,
    example: '847833',
    description: 'Valor CRU lido nesta posição (a normalização é só interna).',
  })
  valorLido: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 0.998,
    description:
      'Lastro da leitura. Vem junto para o humano decidir qual posição ' +
      're-inspecionar — o sistema NÃO usa confiança para eleger uma ' +
      '"vencedora": voto majoritário não aprova peça.',
  })
  confianca: number | null;

  @ApiProperty({
    enum: VEREDITOS,
    example: 'divergente',
    description: 'Veredito que este campo já recebeu; a coerência não o reescreve.',
  })
  veredito: Veredito;
}

/**
 * Campos IRMÃOS (o QR manda todos carregarem o mesmo número) que leram coisas
 * diferentes entre si.
 */
export class IncoerenciaEntreCamposResposta implements IncoerenciaEntreCampos {
  @ApiProperty({
    type: String,
    example: '847233',
    description: 'Valor único que o QR manda para todos os campos do grupo.',
  })
  valorEsperado: string;

  @ApiProperty({
    type: [String],
    example: ['serie-chumbada-topo', 'serie-placa'],
    description: 'Campos que produziram leitura comparável, em ordem de checklist.',
  })
  campos: string[];

  @ApiProperty({
    type: [String],
    example: ['847233', '847833'],
    description: 'Valores distintos lidos no grupo, em ordem de primeira aparição.',
  })
  valoresLidos: string[];

  @ApiProperty({
    type: [LeituraDoGrupoResposta],
    description: 'Cada leitura do grupo com seu lastro e o veredito do campo.',
  })
  leituras: LeituraDoGrupoResposta[];
}

/** Um campo comparado pela engine e já persistido como CampoConferido. */
export class CampoExecutado implements ResultadoCampo {
  @ApiProperty({
    type: String,
    example: 'serie-placa',
    description:
      'Nome do campo na checklist do ProjetoModelo. O PREFIXO é contrato ' +
      '(`serie-`, `patrimonio-`, `cliente-`): é por ele que a API acha o valor ' +
      'esperado no QR. O resto do nome diz como foi gravado e em qual vista ' +
      'está (`serie-chumbada-topo`, `patrimonio-serigrafia-frente`).',
  })
  campo: string;

  @ApiProperty({
    type: String,
    example: 'placa',
    description:
      'VISTA da peça onde a marcação está (`topo`, `frente`, `traseira`, ' +
      '`lateral-esquerda`, `lateral-direita`, `base`, mais os closes `placa` e ' +
      '`etiqueta` e o escape `geral`). É o mesmo vocabulário do `fonteFisica` ' +
      'da foto — é assim que campo e evidência se pareiam.',
  })
  fonteFisica: string;

  @ApiProperty({
    type: Boolean,
    example: true,
    description:
      'Obrigatoriedade do campo na checklist. Explica um `nao_conferivel` que ' +
      'NÃO derrubou o veredito geral: campo opcional ilegível não bloqueia o ' +
      'conforme (critério 4 do SPEC).',
  })
  obrigatorio: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '847233',
    description:
      'Valor que o QR da etiqueta manda (fonte da verdade única desta rodada). ' +
      '`null` quando o QR não traz o dado do campo — ex.: `potencia-*`.',
  })
  valorEsperado: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '847833',
    description:
      'Valor que a visão leu na peça. `null` quando não houve leitura ' +
      'aproveitável (ver `motivo`).',
  })
  valorLido: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 0.998,
    description:
      'Score 0..1 da leitura. Abaixo do limiar (padrão 0.9) o campo vira ' +
      '`nao_conferivel`, mesmo que o valor lido seja igual ao esperado.',
  })
  confianca: number | null;

  @ApiProperty({
    enum: VEREDITOS,
    example: 'divergente',
    description: DESCRICAO_VEREDITO_CAMPO,
  })
  veredito: Veredito;

  @ApiProperty({
    required: false,
    enum: MOTIVOS_CAMPO,
    example: 'leitura-nao-corroborada',
    description: DESCRICAO_MOTIVO,
  })
  motivo?: MotivoCampo;

  @ApiProperty({
    required: false,
    type: String,
    example: 'patrimonio-serigrafia-topo',
    description:
      'COM QUAL campo a leitura casou. Presente APENAS quando `motivo` é ' +
      '`leitura-de-outro-campo` — é o que distingue "a foto pegou a marcação ' +
      'vizinha" (reenquadrar) de "a peça foi gravada com o número do vizinho" ' +
      '(não conformidade real).',
  })
  campoDaLeitura?: string;

  @ApiProperty({
    type: String,
    example: '1b0e6a4c-52d7-4a1f-9c33-77a2e5b41d90',
    description:
      'Id do CampoConferido gravado — o lastro auditável deste veredito. É a ' +
      'mesma linha que `GET /conferencias/{id}/campos` devolve na releitura.',
  })
  campoConferidoId: string;
}

/** A conferência recém-criada. */
export class ConferenciaDaExecucao {
  @ApiProperty({
    type: String,
    example: 'a4f9c1d2-7b3e-4c58-9de0-1f2a3b4c5d6e',
    description:
      'Id da conferência. Use em `GET /conferencias/{id}/campos` para remontar ' +
      'a tela de veredito depois (refresh, navegação, histórico).',
  })
  id: string;

  @ApiProperty({
    enum: VEREDITOS,
    example: 'divergente',
    description: DESCRICAO_VEREDITO_GERAL,
  })
  vereditoGeral: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T13:02:11.412Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: CheckpointResumo,
    nullable: true,
    description:
      'Etapa em que o veredito saiu; `null` quando a request não fixou etapa ' +
      '(conferência da checklist inteira).',
  })
  checkpoint: CheckpointResumo | null;
}

/** A peça conferida, resolvida a partir do QR. */
export class TransformadorDaExecucao extends TransformadorResumo {
  @ApiProperty({
    type: String,
    example: 'EPT-163-PI-676',
    description:
      'Código do ProjetoModelo cuja checklist foi usada. Resolvido em cascata: ' +
      'código do projeto no QR → vínculo já existente na peça → único projeto ' +
      'cadastrado.',
  })
  projetoModeloCodigo: string;
}

export class ResultadoExecucao {
  @ApiProperty({ type: ConferenciaDaExecucao })
  conferencia: ConferenciaDaExecucao;

  @ApiProperty({ type: TransformadorDaExecucao })
  transformador: TransformadorDaExecucao;

  @ApiProperty({
    type: EtapaResumo,
    nullable: true,
    description:
      'Etapa que definiu o RECORTE da checklist; `null` = checklist inteira. ' +
      'CONFERÊNCIA PARCIAL: com etapa preenchida o veredito cobre só os campos ' +
      'já gravados na peça até esse gate (na adesivação a placa nem existe), ' +
      'então "última conferência conforme" NÃO atesta peça inteira. Exiba ' +
      'sempre a etapa junto do veredito.',
  })
  etapaAvaliada: EtapaResumo | null;

  @ApiProperty({
    type: Number,
    example: 3,
    description:
      'Quantos itens da checklist entraram no recorte desta etapa. Pode ser ' +
      'MAIOR que `campos.length`: item opcional sem valor esperado no QR é ' +
      'omitido pela engine. Serve para a tela dizer "gate da adesivação: 3 dos ' +
      '9 campos do modelo" em vez de dar a peça por completa.',
  })
  camposAvaliados: number;

  @ApiProperty({
    type: [CampoExecutado],
    description:
      'Veredito campo a campo, na ordem da checklist. Um CampoConferido foi ' +
      'gravado para cada item.',
  })
  campos: CampoExecutado[];

  @ApiProperty({
    type: [IncoerenciaEntreCamposResposta],
    description:
      'Grupos de campos IRMÃOS — os que o QR manda carregar o mesmo número (as ' +
      '3 séries chumbadas + a da placa; os patrimônios entre si) — que leram ' +
      'valores DIFERENTES entre si. Só REBAIXA: impede o `conforme` geral e ' +
      'nunca suaviza um `divergente`. Vazio na esmagadora maioria das ' +
      'execuções. NÃO É PERSISTIDO nesta rodada: some na releitura ' +
      '(`GET /conferencias/{id}/campos`) — só o EFEITO dele no `vereditoGeral` ' +
      'fica gravado. Se a tela precisa mostrar "as posições da série não ' +
      'concordam", guarde este trecho da resposta do POST.',
  })
  incoerencias: IncoerenciaEntreCamposResposta[];
}

/**
 * Equivalência estrutural com os tipos da engine verificada em COMPILAÇÃO, nos
 * DOIS sentidos — é o que impede a classe de documentação de virar uma segunda
 * verdade que diverge em silêncio. Um campo a mais ou a menos de qualquer lado
 * quebra o build aqui.
 */
type Exige<T extends true> = T;
export type EQUIVALENCIA_COM_A_ENGINE = [
  Exige<
    IncoerenciaEntreCampos extends IncoerenciaEntreCamposResposta ? true : false
  >,
  Exige<
    IncoerenciaEntreCamposResposta extends IncoerenciaEntreCampos ? true : false
  >,
  Exige<LeituraDoGrupo extends LeituraDoGrupoResposta ? true : false>,
  Exige<LeituraDoGrupoResposta extends LeituraDoGrupo ? true : false>,
  Exige<ResultadoCampo extends Omit<CampoExecutado, 'campoConferidoId'> ? true : false>,
];
