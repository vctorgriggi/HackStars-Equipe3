import {
  // decorators here
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

/**
 * Registro de passagem pelo que o operador REALMENTE tem em maos: o QR da
 * etiqueta e a etapa em que o dispositivo esta fixado. O `POST /passagens`
 * gerado exige dois UUIDs (checkpoint.id e transformador.id) que o celular nao
 * conhece — por isso este DTO fala em `payloadQr` + `etapaCodigo`.
 */
export class RegistrarPassagemDto {
  @ApiProperty({
    required: true,
    type: () => String,
    description: 'Conteudo bruto lido do QR da etiqueta',
  })
  @IsString()
  @IsNotEmpty()
  payloadQr: string;

  @ApiProperty({
    required: true,
    type: () => String,
    example: 'serigrafia',
    description:
      'Codigo (slug) do Checkpoint da etapa. Obrigatorio: passagem sem etapa ' +
      'nao existe (a coluna e NOT NULL) e o codigo e o identificador estavel ' +
      'do gate — nunca o nome exibido nem a ordem.',
  })
  @IsString()
  @IsNotEmpty()
  etapaCodigo: string;

  @ApiProperty({
    required: false,
    type: () => String,
    description:
      'Excecao anotada na passagem (ex.: "parou por erro aceito pelo time"). ' +
      'OBRIGATORIA quando `conferenciaId` aponta uma conferencia nao-conforme ' +
      '(liberacao com excecao) — sem ela a request responde 422 ' +
      '`excecao-sem-observacao`.',
  })
  @IsOptional()
  @IsString()
  observacao?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
    format: 'uuid',
    description:
      'Conferencia que COMPROVA esta passagem (fluxo do gate da estacao). ' +
      'Deve ser da MESMA peca do QR e do MESMO checkpoint de `etapaCodigo` — ' +
      'senao 422 `conferencia-de-outra-peca` / `conferencia-de-outra-etapa` ' +
      '(conferencia sem checkpoint tambem cai na de etapa: passagem e de um ' +
      'gate). Conferencia `conforme`: passagem normal. Nao-conforme: e a ' +
      'REPROVA HUMANA da leitura — exige `observacao` (422 ' +
      '`excecao-sem-observacao`), e a excecao fica auditavel na passagem. ' +
      'Id desconhecido: 422 `conferencia-inexistente`.',
  })
  @IsOptional()
  @IsUUID()
  conferenciaId?: string | null;
}
