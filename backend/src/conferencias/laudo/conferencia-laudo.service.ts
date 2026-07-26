import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { REDATOR_PORT, RedatorPort } from '../../extracao/ports/redator.port';
import { ConferenciaConsultasService } from '../consultas/conferencia-consultas.service';
import { Conferencia } from '../domain/conferencia';
import { LaudoDaConferencia } from '../dto/laudo.dto';
import {
  garantirDisclaimer,
  montarFatosDoLaudo,
} from './montar-fatos-do-laudo';

/**
 * LAUDO POR IA — redação sobre veredito, nunca veredito por redação.
 *
 * O fluxo inteiro cabe em quatro passos, e a ordem deles e o que mantem a
 * regra de ouro de pe:
 *
 * 1. RELE o veredito PERSISTIDO pela MESMA porta que `GET /conferencias/:id/
 *    campos` usa (`ConferenciaConsultasService`). Nao ha segunda leitura do
 *    banco nem segunda montagem: se a tela e o laudo divergissem, o bug
 *    estaria em qual dos dois? Com uma fonte so, a pergunta nao existe;
 * 2. TRADUZ para `FatosDoLaudo` (funcao pura) — o pacote fechado que o modelo
 *    tem permissao de conhecer;
 * 3. MANDA REDIGIR pela porta. Uma chamada, sob clique do operador;
 * 4. CARIMBA o disclaimer se o modelo o esqueceu.
 *
 * O que este service NAO faz, em nenhuma circunstancia: comparar campo,
 * calcular veredito, corrigir veredito gravado ou persistir o texto. Nada aqui
 * escreve no banco — gerar laudo e operacao de LEITURA mais uma chamada paga.
 *
 * Falha do Bedrock vira 503 `laudo-indisponivel`. NUNCA texto vazio, nunca
 * texto generico de desculpa: um laudo em branco (ou "não foi possível
 * analisar") ao lado de um veredito divergente e lido como "nada a relatar" —
 * o falso OK pela porta dos fundos.
 */
@Injectable()
export class ConferenciaLaudoService {
  private readonly logger = new Logger(ConferenciaLaudoService.name);

  constructor(
    private readonly conferenciaConsultasService: ConferenciaConsultasService,

    @Inject(REDATOR_PORT)
    private readonly redator: RedatorPort,
  ) {}

  async gerarLaudo(
    conferenciaId: Conferencia['id'],
  ): Promise<LaudoDaConferencia> {
    // FORA do try de propósito: conferencia inexistente e 404 do cliente, nao
    // indisponibilidade do redator. Confundir os dois mandaria o operador
    // esperar um serviço voltar por causa de um id errado.
    const veredito =
      await this.conferenciaConsultasService.vereditoPorConferencia(
        conferenciaId,
      );

    const fatos = montarFatosDoLaudo(veredito);

    let texto: string;
    try {
      texto = await this.redator.redigirLaudo(fatos);
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : String(erro);

      this.logger.error(
        `laudo-indisponivel na conferencia ${conferenciaId} ` +
          `(redator ${this.redator.nome}, modelo ${this.redator.modelo}): ${detalhe}`,
      );

      throw new ServiceUnavailableException({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        errors: {
          laudo: `laudo-indisponivel: ${detalhe}`,
        },
      });
    }

    return {
      laudo: garantirDisclaimer(texto),
      modelo: this.redator.modelo,
      geradoEm: new Date().toISOString(),
    };
  }
}
