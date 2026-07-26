import { Logger } from '@nestjs/common';

import { ConsultaVisualPort } from '../ports/consulta-visual.port';
import { BedrockConsultaVisual } from './bedrock-consulta-visual.adapter';
import { resolverRegiao } from './bedrock.extractor';
import { MockConsultaVisual } from './mock.consulta-visual';

/**
 * Escolha do adapter de consulta visual. Uniao literal no lugar de enum
 * (convencao do projeto), como em `extractor.factory.ts`.
 *
 * Default BEDROCK pelo mesmo motivo do `LAUDO_DRIVER`: o produto e texto
 * livre, e uma resposta simulada servida em silencio seria indistinguivel de
 * uma real. Sem credencial AWS a chamada falha alto, em vez de fingir.
 *
 * `CONSULTA_VISUAL_DRIVER=mock` liga o dublê explicitamente (testes, bancada
 * offline).
 */
export type ConsultaVisualDriver = 'bedrock' | 'mock';

export const DRIVER_CONSULTA_PADRAO: ConsultaVisualDriver = 'bedrock';

const DRIVERS: ConsultaVisualDriver[] = ['bedrock', 'mock'];

const logger = new Logger('ConsultaVisualFactory');

export function ehConsultaVisualDriver(
  valor: string,
): valor is ConsultaVisualDriver {
  return (DRIVERS as string[]).includes(valor);
}

/**
 * Le a variavel direto do `process.env` pelo mesmo motivo das outras
 * factories: e chave de bancada, nao configuracao de infraestrutura validada
 * no boot. Se virar configuracao de producao, promover para
 * `src/extracao/config/` no formato do boilerplate.
 */
export function criarConsultaVisual(
  driverBruto: string | undefined = process.env.CONSULTA_VISUAL_DRIVER,
  regiao: string = resolverRegiao(),
): ConsultaVisualPort {
  const driver = (driverBruto ?? '').trim().toLowerCase();

  if (driver.length === 0) {
    return new BedrockConsultaVisual(regiao);
  }

  if (!ehConsultaVisualDriver(driver)) {
    // Driver invalido nao derruba a aplicacao e tambem nao cai calado no
    // dublê: cair no mock por engano de digitacao serviria resposta simulada
    // como se fosse real. Cai no padrao (real) e diz alto que caiu.
    logger.warn(
      `CONSULTA_VISUAL_DRIVER invalido: "${driverBruto}". Valores aceitos: ` +
        `${DRIVERS.join(' | ')}. Usando "${DRIVER_CONSULTA_PADRAO}".`,
    );
    return new BedrockConsultaVisual(regiao);
  }

  return driver === 'mock'
    ? new MockConsultaVisual()
    : new BedrockConsultaVisual(regiao);
}
