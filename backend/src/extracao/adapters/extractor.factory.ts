import { Logger } from '@nestjs/common';

import { ExtractorPort } from '../ports/extractor.port';
import { BedrockExtractor, resolverRegiao } from './bedrock.extractor';
import { MockExtractor } from './mock.extractor';
import { TextractExtractor } from './textract.extractor';

/**
 * Escolha do adapter de visao. Uniao literal no lugar de enum (convencao do
 * projeto).
 *
 * `mock` e o DEFAULT de proposito: sem credencial AWS o sistema continua
 * funcional (sobe, roda conferencia, passa nos testes) em vez de quebrar no
 * boot. Ligar Textract ou Bedrock e uma decisao explicita via
 * `EXTRACTOR_DRIVER` — nenhuma chamada paga acontece por acidente.
 */
export type ExtractorDriver = 'mock' | 'textract' | 'bedrock';

export const DRIVER_PADRAO: ExtractorDriver = 'mock';

const DRIVERS: ExtractorDriver[] = ['mock', 'textract', 'bedrock'];

const logger = new Logger('ExtractorFactory');

export function ehExtractorDriver(valor: string): valor is ExtractorDriver {
  return (DRIVERS as string[]).includes(valor);
}

/**
 * Le a variavel direto do `process.env` em vez de passar pelo `ConfigService`:
 * `EXTRACTOR_DRIVER` nao e configuracao de infraestrutura validada no boot, e
 * uma chave de bancada do spike. Se virar configuracao de producao, promover
 * para `src/extracao/config/` no formato do boilerplate.
 */
export function criarExtractor(
  driverBruto: string | undefined = process.env.EXTRACTOR_DRIVER,
  regiao: string = resolverRegiao(),
): ExtractorPort {
  const driver = (driverBruto ?? '').trim().toLowerCase();

  if (driver.length === 0) {
    return new MockExtractor();
  }

  if (!ehExtractorDriver(driver)) {
    // Driver invalido nao derruba a aplicacao, mas tambem nao passa
    // despercebido: cai no mock e diz alto que caiu.
    logger.warn(
      `EXTRACTOR_DRIVER invalido: "${driverBruto}". Valores aceitos: ` +
        `${DRIVERS.join(' | ')}. Usando "${DRIVER_PADRAO}".`,
    );
    return new MockExtractor();
  }

  switch (driver) {
    case 'textract':
      return new TextractExtractor(regiao);
    case 'bedrock':
      return new BedrockExtractor(regiao);
    default:
      return new MockExtractor();
  }
}
