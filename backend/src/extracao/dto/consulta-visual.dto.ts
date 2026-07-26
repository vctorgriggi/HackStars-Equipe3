import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Corpo multipart do `POST /extracao/consulta-visual` (a foto vai a parte). */
export class ConsultaVisualDto {
  @ApiProperty({
    description: 'Pergunta ou instrucao enviada ao modelo junto com a foto.',
    example: 'Qual é o número de série gravado neste transformador?',
  })
  @IsString()
  @IsNotEmpty()
  texto: string;
}

/**
 * Resposta do endpoint. CLASSE com @ApiProperty, nunca interface — o Swagger
 * so enxerga classes (regra do CLAUDE.md).
 */
export class RespostaConsultaVisual {
  @ApiProperty({
    description:
      'Texto livre devolvido pelo modelo. NAO e leitura de campo: nao ' +
      'carrega confianca nem evidencia e jamais entra em veredito de ' +
      'conformidade.',
    example: 'O número de série visível na peça é 847233.',
  })
  resposta: string;

  @ApiProperty({
    description: 'Modelo que respondeu ("mock" quando o driver e o dublê).',
    example: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  })
  modelo: string;

  @ApiProperty({
    description: 'Driver ativo (CONSULTA_VISUAL_DRIVER): bedrock | mock.',
    example: 'bedrock',
  })
  driver: string;
}
