import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

import {
  // decorators here
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Teto de fotos por conferencia. Cada foto e UMA chamada paga de visao
 * (SPEC, constraint 4) — o limite vive no contrato, explicito, e nao escondido
 * dentro do servico. 10 cobre a peca de demo (placa + serigrafia + 3
 * chumbados) com folga para refoto.
 */
export const MAX_FOTOS_POR_CONFERENCIA = 10;

export class ExecutarComFotosDto {
  @ApiProperty({
    required: true,
    type: () => String,
    description: 'Conteudo bruto lido do QR da etiqueta',
  })
  @IsString()
  @IsNotEmpty()
  payloadQr: string;

  @ApiProperty({
    required: false,
    type: () => String,
    example: 'fixacao-placa',
    description: 'Codigo (slug) do Checkpoint da etapa; opcional',
  })
  @IsOptional()
  @IsString()
  etapaCodigo?: string;

  @ApiProperty({
    required: false,
    type: () => Number,
    minimum: 0,
    maximum: 1,
    description: 'Limiar de confianca da engine; ausente usa o padrao (0.9)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  limiarConfianca?: number;

  @ApiProperty({
    required: true,
    type: () => [String],
    format: 'uuid',
    maxItems: MAX_FOTOS_POR_CONFERENCIA,
    description:
      'Ids de FotoEvidencia ja enviadas (POST /fotos-evidencia/upload). ' +
      'A fonte fisica de cada foto vem do proprio registro; ' +
      `maximo ${MAX_FOTOS_POR_CONFERENCIA} — cada foto e uma chamada paga ` +
      'de visao.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_FOTOS_POR_CONFERENCIA)
  // Sem fixar versao: o id vem do banco, e recusar um uuid valido de outra
  // versao seria 400 em foto que existe.
  @IsUUID(undefined, { each: true })
  fotoEvidenciaIds: string[];

  @ApiProperty({
    required: false,
    type: () => Boolean,
    description:
      'GATE da estacao: com `true`, veredito `conforme` registra a Passagem ' +
      'pela etapa AUTOMATICAMENTE (a peca avanca na esteira e o evento de ' +
      'tempo real e emitido), vinculada a esta conferencia. Exige ' +
      '`etapaCodigo` (422 `registro-de-passagem-exige-etapa` — passagem e de ' +
      'um gate, nunca da checklist inteira). Veredito `divergente` ou ' +
      '`nao_conferivel` NUNCA registra passagem: a liberacao passa pela ' +
      'decisao humana (`POST /passagens/registrar` com `conferenciaId` + ' +
      '`observacao`). Falha no registro nao derruba o veredito ja gravado: a ' +
      'resposta sai com `passagemRegistrada: null`.',
  })
  @IsOptional()
  @IsBoolean()
  registrarPassagemSeConforme?: boolean;

  // leituras NAO entram aqui de proposito: neste endpoint quem produz leitura
  // e a visao, e o veredito continua nascendo na engine (regra de ouro).
}
