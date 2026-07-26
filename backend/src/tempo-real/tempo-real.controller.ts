import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { OcupacaoEsteiraService } from './consultas/ocupacao-esteira.service';
import { EsteiraSnapshot } from './dto/esteira-snapshot.dto';

@ApiTags('Tempo real')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'tempo-real',
  version: '1',
})
export class TempoRealController {
  constructor(private readonly ocupacaoEsteira: OcupacaoEsteiraService) {}

  @Get('esteira')
  @ApiOperation({
    summary: 'Ocupacao atual da linha: pecas por checkpoint',
    description:
      'Estado INICIAL da esteira de tempo real. A posicao de cada peca e ' +
      'DERIVADA da ultima passagem dela (SPEC: posicao nunca e coluna); peca ' +
      'sem passagem nao esta na linha. Todos os checkpoints aparecem, mesmo ' +
      'vazios, ordenados por `ordem`. Dali em diante o cliente escuta o ' +
      'evento Socket.IO `passagem-registrada` (namespace `/tempo-real`, path ' +
      'default `/socket.io`) e SUBSTITUI os totais pelos do evento; a cada ' +
      'reconnect, rebusca este snapshot — evento perdido nao deixa a tela ' +
      'mentindo. Sem teto nesta rodada (volume de demo).',
  })
  @ApiOkResponse({ type: EsteiraSnapshot })
  esteira(): Promise<EsteiraSnapshot> {
    return this.ocupacaoEsteira.snapshot();
  }
}
