import {
  // decorators here
  IsNotEmpty,
  IsOptional,
  IsString,
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
      'Excecao anotada na passagem (ex.: "parou por erro aceito pelo time")',
  })
  @IsOptional()
  @IsString()
  observacao?: string | null;
}
