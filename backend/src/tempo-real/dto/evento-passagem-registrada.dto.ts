import { ApiProperty } from '@nestjs/swagger';

import { EtapaResumo } from '../../conferencias/dto/resumos-compartilhados.dto';
import { ResultadoRegistroPassagem } from '../../passagens/dto/resultado-registro-passagem.dto';

/**
 * Payload do evento Socket.IO `passagem-registrada` (namespace `/tempo-real`).
 * O Swagger nao documenta WebSocket, mas o contrato vive como CLASSE mesmo
 * assim — e a convencao do repo para todo tipo que atravessa a fronteira
 * API ↔ front, e `TotalDoCheckpoint` e reusada pelo snapshot HTTP.
 */

export class TotalDoCheckpoint {
  @ApiProperty({
    type: String,
    example: 'serigrafia',
    description: 'Slug estavel do checkpoint — o front casa por ele.',
  })
  codigo: string;

  @ApiProperty({
    type: Number,
    example: 3,
    description: 'Pecas cuja ULTIMA passagem foi neste checkpoint.',
  })
  total: number;
}

export class EventoPassagemRegistrada {
  @ApiProperty({
    type: ResultadoRegistroPassagem,
    description:
      'O MESMO payload da resposta do `POST /passagens/registrar` — quem ' +
      'escuta o evento ve exatamente o que o operador que escaneou viu.',
  })
  resultado: ResultadoRegistroPassagem;

  @ApiProperty({
    type: EtapaResumo,
    nullable: true,
    description:
      'Posicao da peca ANTES desta passagem (ultima passagem anterior); ' +
      '`null` = peca entrando na linha. E o `from` da animacao — vem do ' +
      'servidor porque o estado do cliente pode ter perdido eventos.',
  })
  checkpointAnterior: EtapaResumo | null;

  @ApiProperty({
    type: TotalDoCheckpoint,
    isArray: true,
    description:
      'Totais de TODOS os checkpoints, recalculados no banco APOS a escrita. ' +
      'O cliente SUBSTITUI os seus, nunca incrementa — evento perdido e ' +
      'curado pelo proximo (e pelo snapshot no reconnect).',
  })
  totais: TotalDoCheckpoint[];
}
