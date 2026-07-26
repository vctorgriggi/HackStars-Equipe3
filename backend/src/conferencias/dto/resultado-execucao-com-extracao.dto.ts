import { ApiProperty } from '@nestjs/swagger';

// Sentido UNICO de import: o dto de registro de passagem so depende de
// resumos-compartilhados e conferencia-resumo — nenhum dos dois volta aqui.
import { ResultadoRegistroPassagem } from '../../passagens/dto/resultado-registro-passagem.dto';
import { ResultadoExecucao } from './resultado-execucao.dto';
import { FotoDaEvidenciaResposta } from './resumos-compartilhados.dto';

/**
 * Resposta de `POST /conferencias/executar-com-fotos` — o caminho principal do
 * operador. É a `ResultadoExecucao` do endpoint de leituras digitadas MAIS dois
 * blocos que só existem quando a visão rodou: `extracao` (o que a visão fez, e
 * o que deixou de fazer) e `achadosInconsistentes` (alarme informativo).
 *
 * Classe em vez de interface pelo mesmo motivo do arquivo irmão: o Swagger só
 * documenta classes, e este era o endpoint com o schema de resposta mais caro
 * de adivinhar.
 */

/** O que a visão efetivamente fez nesta execução (transparência de custo). */
export class ResumoExtracao {
  @ApiProperty({
    type: String,
    example: 'textract',
    enum: ['mock', 'textract', 'bedrock'],
    description:
      'Adapter de visão ativo (env `EXTRACTOR_DRIVER`). `mock` devolve ' +
      'leituras fixas da peça de demo e não gasta AWS; `textract` é o do ' +
      'ambiente no ar. Útil na tela de suporte: leitura estranha com driver ' +
      '`mock` é ambiente, não peça.',
  })
  driver: string;

  @ApiProperty({
    type: Number,
    example: 3,
    description:
      'Fotos efetivamente enviadas ao extrator. Cada uma custa no máximo 3 ' +
      'chamadas de visão (a foto inteira + 2 recortes de corroboração do ' +
      'relevo) — teto fixo, nunca laço.',
  })
  fotos: number;

  @ApiProperty({
    type: Number,
    example: 5,
    description:
      'Leituras que a visão produziu, ANTES de a engine julgar qualquer uma. ' +
      'Zero aqui não é erro: os campos saem `nao_conferivel`, que é o veredito ' +
      'honesto para uma peça que a visão não leu.',
  })
  leiturasProduzidas: number;

  @ApiProperty({
    type: Number,
    example: 1,
    description:
      'Fotos informadas que NÃO foram enviadas à visão porque nenhum campo do ' +
      'recorte desta etapa sai da vista delas (a foto `geral` é o caso ' +
      'clássico; no gate da adesivação, a da placa também). Não é erro — é o ' +
      'custo que deixou de ser pago, explícito. Se o operador fotografou e o ' +
      'número aqui subiu, a etapa da URL provavelmente está errada.',
  })
  fotosForaDoRecorte: number;

  @ApiProperty({
    type: Number,
    example: 34,
    description:
      'Total BRUTO de achados livres: todo texto que a visão leu e que não ' +
      'virou leitura de campo alvo, antes de qualquer filtro. Mostra o quanto ' +
      'o alarme filtrou — `achadosLivres: 34` com `achadosInconsistentes: []` ' +
      'significa "34 textos vistos, nenhum parecido com identificador ' +
      'estranho". NUNCA altera veredito.',
  })
  achadosLivres: number;
}

/** Uma evidência de onde o texto estranho apareceu. */
export class OcorrenciaAchado {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'c0ffee00-1111-2222-3333-444455556666',
    description:
      'Foto em que o texto apareceu; `null` se o extrator não informou. ' +
      'Mantido por compatibilidade — é o mesmo id de `foto.id` quando `foto` ' +
      'vem preenchida.',
  })
  fotoEvidenciaId: string | null;

  @ApiProperty({
    type: FotoDaEvidenciaResposta,
    nullable: true,
    description:
      'A foto em que o texto estranho apareceu, com URL pronta e a vista que ' +
      'ela mostra — o alarme já vem com a evidência para o operador olhar, ' +
      'sem segunda chamada. Combinada com `regiaoLeitura`, dá para destacar o ' +
      'trecho exato. `null` quando o extrator não vinculou a foto (ou o ' +
      'registro não foi encontrado); nesses casos `fotoEvidenciaId` também é ' +
      '`null`. Validade de 1 h da `url` sob `FILE_DRIVER=s3`.',
  })
  foto: FotoDaEvidenciaResposta | null;

  @ApiProperty({
    type: Number,
    example: 0.982,
    description: 'Score 0..1 da leitura do texto.',
  })
  confianca: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '{"Left":0.31,"Top":0.62,"Width":0.12,"Height":0.04}',
    description:
      'Bounding box da leitura na foto, quando o serviço forneceu — permite ' +
      'destacar na imagem onde o texto estranho está.',
  })
  regiaoLeitura: string | null;
}

/**
 * Texto lido na peça que PARECE um identificador e não bate com nada do QR.
 */
export class AchadoInconsistente {
  @ApiProperty({
    type: String,
    example: '847833',
    description: 'Texto como o serviço de visão leu, sem normalização.',
  })
  texto: string;

  @ApiProperty({
    type: [OcorrenciaAchado],
    description:
      'Todas as vezes que ele apareceu — 1 alarme, N evidências (o mesmo ' +
      'número lido em 3 blocos não vira 3 alarmes).',
  })
  ocorrencias: OcorrenciaAchado[];
}

export class ResultadoExecucaoComExtracao extends ResultadoExecucao {
  @ApiProperty({
    type: ResumoExtracao,
    description:
      'O que a visão fez nesta execução. Nada aqui influencia veredito; é ' +
      'transparência de custo e de cobertura.',
  })
  extracao: ResumoExtracao;

  @ApiProperty({
    type: [AchadoInconsistente],
    description:
      'ALARME INFORMATIVO, nunca veredito: textos com cara de identificador ' +
      '(só dígitos, com o mesmo comprimento dos identificadores do QR) que a ' +
      'visão leu na peça e o QR não conhece. Pega placa de outra peça, ' +
      'etiqueta divergente e peça trocada na esteira — casos que a checklist ' +
      'sozinha não vê. NUNCA entra no `vereditoGeral` nem em campo nenhum ' +
      '(consistência não enxerga ausência: peça lisa sai daqui sem alarme, e ' +
      'promover `conforme` a partir disso seria falso OK). Também NÃO é ' +
      'persistido nesta rodada — some na releitura.',
  })
  achadosInconsistentes: AchadoInconsistente[];

  @ApiProperty({
    type: ResultadoRegistroPassagem,
    nullable: true,
    description:
      'A Passagem que o GATE registrou automaticamente, quando ' +
      '`registrarPassagemSeConforme: true` e o veredito saiu `conforme` — o ' +
      'mesmo shape do `POST /passagens/registrar`, com `ultimaConferencia` = ' +
      'esta conferência. `null` em três casos, deliberadamente distintos só ' +
      'pelo contexto: flag ausente/false (gate não pedido), veredito não ' +
      '`conforme` (a peça NÃO passa — decisão humana via ' +
      '`POST /passagens/registrar`), ou falha no registro após o veredito ' +
      '(best-effort anunciado no log `falha-ao-registrar-passagem`; o ' +
      'veredito desta resposta continua válido e gravado).',
  })
  passagemRegistrada: ResultadoRegistroPassagem | null;
}
