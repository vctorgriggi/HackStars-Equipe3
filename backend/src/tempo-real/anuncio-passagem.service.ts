import { Injectable, Logger } from '@nestjs/common';

import { EtapaResumo } from '../conferencias/dto/resumos-compartilhados.dto';
import { ResultadoRegistroPassagem } from '../passagens/dto/resultado-registro-passagem.dto';

import { OcupacaoEsteiraService } from './consultas/ocupacao-esteira.service';
import { TempoRealGateway } from './tempo-real.gateway';

/**
 * Anuncia uma passagem recem-gravada no canal de tempo real. E a UNICA coisa
 * que `passagens/` conhece do modulo: o service de registro chama
 * `anunciar()` depois da escrita e segue a vida.
 *
 * NUNCA lanca: quando este metodo roda, a Passagem JA esta no banco — um erro
 * aqui viraria 500 para um scan que DEU CERTO, e o operador tentaria de novo
 * (passagem duplicada). Falha de difusao e perda de um evento, e evento
 * perdido se cura sozinho: os totais do proximo evento sao absolutos e o
 * cliente rebusca o snapshot a cada reconnect.
 */
@Injectable()
export class AnuncioPassagemService {
  private readonly logger = new Logger(AnuncioPassagemService.name);

  constructor(
    private readonly gateway: TempoRealGateway,
    private readonly ocupacaoEsteira: OcupacaoEsteiraService,
  ) {}

  async anunciar(
    resultado: ResultadoRegistroPassagem,
    checkpointAnterior: EtapaResumo | null,
  ): Promise<void> {
    try {
      const totais = await this.ocupacaoEsteira.totais();
      this.gateway.emitirPassagemRegistrada({
        resultado,
        checkpointAnterior,
        totais,
      });
    } catch (erro) {
      this.logger.error(
        `anuncio da passagem ${resultado.passagem.id} falhou (o scan segue valido)`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }
  }
}
