import { Logger } from '@nestjs/common';

import { RedatorPort } from '../ports/redator.port';
import { BedrockRedator } from './bedrock-redator.adapter';
import { resolverRegiao } from './bedrock.extractor';
import { MockRedator } from './mock.redator';

/**
 * Escolha do adapter de redacao do laudo. Uniao literal no lugar de enum
 * (convencao do projeto), como em `extractor.factory.ts`.
 *
 * O DEFAULT AQUI E O OPOSTO DO `EXTRACTOR_DRIVER`, e de proposito.
 *
 * La o mock e o padrao porque o sistema tem de SUBIR e CONFERIR sem AWS — e o
 * mock produz leituras que a engine julga, com veredito e evidencia visiveis
 * como "modo simulado" na tela. Aqui o produto e PROSA: um texto de laudo
 * gerado por um dublê é indistinguível de um redigido, e o leitor age sobre
 * ele. Entao o padrao e o servico real, e a falta de credencial vira erro
 * `laudo-indisponivel` — o veredito, que e o que importa, continua na tela.
 *
 * `LAUDO_DRIVER=mock` liga o dublê explicitamente (testes, bancada offline).
 */
export type RedatorDriver = 'bedrock' | 'mock';

export const DRIVER_LAUDO_PADRAO: RedatorDriver = 'bedrock';

const DRIVERS: RedatorDriver[] = ['bedrock', 'mock'];

const logger = new Logger('RedatorFactory');

export function ehRedatorDriver(valor: string): valor is RedatorDriver {
  return (DRIVERS as string[]).includes(valor);
}

/**
 * Le a variavel direto do `process.env` pelo mesmo motivo que a factory de
 * extracao: e chave de bancada, nao configuracao de infraestrutura validada no
 * boot.
 */
export function criarRedator(
  driverBruto: string | undefined = process.env.LAUDO_DRIVER,
  regiao: string = resolverRegiao(),
): RedatorPort {
  const driver = (driverBruto ?? '').trim().toLowerCase();

  if (driver.length === 0) {
    return new BedrockRedator(regiao);
  }

  if (!ehRedatorDriver(driver)) {
    // Driver invalido nao derruba a aplicacao e tambem nao cai calado no dublê:
    // cair no mock por engano de digitacao serviria laudo simulado como se
    // fosse real. Cai no padrao (real) e diz alto que caiu.
    logger.warn(
      `LAUDO_DRIVER invalido: "${driverBruto}". Valores aceitos: ` +
        `${DRIVERS.join(' | ')}. Usando "${DRIVER_LAUDO_PADRAO}".`,
    );
    return new BedrockRedator(regiao);
  }

  return driver === 'mock' ? new MockRedator() : new BedrockRedator(regiao);
}
