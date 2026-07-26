import { ApiProperty } from '@nestjs/swagger';

import { DISCLAIMER_LAUDO } from '../../extracao/ports/redator.port';

/**
 * Resposta de `POST /conferencias/:id/laudo`.
 *
 * CLASSE e nao interface, como toda resposta de endpoint de dominio aqui: o
 * Swagger so enxerga classes, e interface some na compilacao — a rota chegaria
 * ao front com schema de resposta vazio.
 */
export class LaudoDaConferencia {
  @ApiProperty({
    type: String,
    example:
      'A conferência da peça 847233 saiu DIVERGENTE no gate de fixação da ' +
      'placa. A etiqueta manda 847233 e a placa está gravada 847833: a peça ' +
      'para até a correção.\n\n' +
      DISCLAIMER_LAUDO,
    description:
      'O laudo em prosa, pronto para exibir. Parágrafos separados por linha ' +
      'em branco; sem markdown, sem título e sem lista.\n\n' +
      'O QUE ELE É: redação sobre os fatos que a engine JÁ decidiu e o banco ' +
      'JÁ guardou. O modelo de linguagem recebe um pacote fechado (peça, ' +
      'etapa, veredito geral, campos com esperado/lido/confiança e as ' +
      'contagens) e escreve texto sobre ele.\n\n' +
      'O QUE ELE NÃO É: fonte de veredito. Ele não compara campo, não ' +
      'reclassifica, não suaviza e não completa nada — se o texto discordar ' +
      'do veredito gravado, quem vale é o veredito. Por isso o texto SEMPRE ' +
      'termina com "' +
      DISCLAIMER_LAUDO +
      '": a frase vem do prompt e, se o modelo a esquecer, a API a carimba.\n\n' +
      'LIMITE CONHECIDO (gap 22 do CLAUDE.md): `motivo` do campo, ' +
      '`incoerencias` e `achadosInconsistentes` NÃO são persistidos, então o ' +
      'laudo não fala deles — ele só relata o que está gravado.',
  })
  laudo: string;

  @ApiProperty({
    type: String,
    example: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    description:
      'Modelo que redigiu (env `LAUDO_MODEL_ID`). O valor `mock` significa ' +
      'que o servidor está com `LAUDO_DRIVER=mock` e o texto é SIMULADO, não ' +
      'redigido por IA — exiba isso ao usuário, não o esconda.',
  })
  modelo: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T14:31:07.884Z',
    description:
      'Quando o laudo foi redigido — não confundir com a data da conferência. ' +
      'O laudo NÃO é persistido nesta rodada: cada clique gera um texto novo, ' +
      'e dois laudos da mesma conferência podem ter redação diferente (o ' +
      'veredito, esse sim gravado, é sempre o mesmo).',
  })
  geradoEm: string;
}
