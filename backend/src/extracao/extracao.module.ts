import { Module, Provider } from '@nestjs/common';

import { criarExtractor } from './adapters/extractor.factory';
import { ExtracaoService } from './extracao.service';
import { EXTRACTOR_PORT } from './ports/extractor.port';

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

@Module({
  providers: [extractorProvider, ExtracaoService],
  exports: [ExtracaoService, EXTRACTOR_PORT],
})
export class ExtracaoModule {}
