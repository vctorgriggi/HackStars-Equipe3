import { Module, Provider } from '@nestjs/common';

import { criarExtractor } from './adapters/extractor.factory';
import { criarRedator } from './adapters/redator.factory';
import { ExtracaoService } from './extracao.service';
import { EXTRACTOR_PORT } from './ports/extractor.port';
import { REDATOR_PORT } from './ports/redator.port';

/**
 * Modulo de servico — sem entidade, sem controller e sem persistencia (por
 * isso nao veio dos generators hygen).
 *
 * O adapter concreto e escolhido no boot por `EXTRACTOR_DRIVER`
 * ('mock' default | 'textract' | 'bedrock'). Quem consome recebe a porta, nao
 * o adapter: trocar Textract por Bedrock depois do spike T2.1 e mudar uma
 * variavel de ambiente, nao codigo de chamada.
 */
export const extractorProvider: Provider = {
  provide: EXTRACTOR_PORT,
  useFactory: () => criarExtractor(),
};

/**
 * Segunda borda de IA do modulo: a que ESCREVE (laudo), separada da que LE
 * (extracao). Portas distintas porque as garantias sao distintas — leitura
 * precisa de confianca calibrada e vira veredito; redacao nao decide nada e
 * so produz texto. Driver por `LAUDO_DRIVER` ('bedrock' default | 'mock').
 */
export const redatorProvider: Provider = {
  provide: REDATOR_PORT,
  useFactory: () => criarRedator(),
};

@Module({
  providers: [extractorProvider, redatorProvider, ExtracaoService],
  exports: [ExtracaoService, EXTRACTOR_PORT, REDATOR_PORT],
})
export class ExtracaoModule {}
