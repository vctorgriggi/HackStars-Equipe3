import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  CampoAlvo,
  EXTRACTOR_PORT,
  ExtractorPort,
  FonteImagem,
  LeituraExtraida,
} from './ports/extractor.port';

/**
 * Item de checklist na forma minima que a extracao precisa. Mais estreito que
 * `ItemChecklist` da engine de proposito: `obrigatorio` e politica de veredito
 * e nao tem nada a ver com o que se le da foto.
 */
export interface AlvoChecklist {
  campo: string;
  fonteFisica: string;
}

/**
 * Roteia foto -> campos e chama o adapter de visao. E o unico consumidor da
 * porta; nenhum controller fala com adapter direto.
 *
 * NAO decide veredito e NAO compara com valor esperado: so produz leituras.
 * Quem julga e `conferir()` em `src/conferencias/engine`.
 */
@Injectable()
export class ExtracaoService {
  private readonly logger = new Logger(ExtracaoService.name);

  constructor(
    @Inject(EXTRACTOR_PORT) private readonly extractor: ExtractorPort,
  ) {}

  /** Nome do adapter ativo — util em log e no retorno de um futuro endpoint. */
  get adapterAtivo(): string {
    return this.extractor.nome;
  }

  /**
   * Para cada foto, filtra os campos do checklist cuja `fonteFisica` casa com
   * a da foto e chama o adapter UMA vez.
   *
   * Regras que moram aqui:
   * - uma chamada de visao por foto, no maximo (constraint 4 do SPEC);
   * - foto cuja `fonteFisica` nao aparece no checklist NAO gera chamada — nao
   *   se paga visao por foto que ninguem vai conferir (a foto 'geral', por
   *   exemplo, costuma ficar de fora);
   * - sem retry automatico: erro do adapter sobe. Reprocessar em laco e o
   *   risco de custo que a constraint 4 proibe; a decisao de tentar de novo e
   *   de quem disparou;
   * - sequencial, nao paralelo: um lote de 6 fotos disparado de uma vez e um
   *   pico de custo e de rate limit sem ganho para a demo;
   * - toda leitura sai carimbada com `fotoEvidenciaId` da foto de origem,
   *   mesmo que o adapter esqueca — vinculo leitura->evidencia e regra de
   *   ouro, nao cortesia do adapter;
   * - leitura de campo fora dos alvos daquela foto e descartada: adapter nao
   *   inventa campo.
   */
  async extrairDeFotos(
    fotos: FonteImagem[],
    checklist: AlvoChecklist[],
  ): Promise<LeituraExtraida[]> {
    const leituras: LeituraExtraida[] = [];

    for (const foto of fotos) {
      const alvos: CampoAlvo[] = checklist
        .filter((item) => item.fonteFisica === foto.fonteFisica)
        .map((item) => ({ campo: item.campo }));

      if (alvos.length === 0) {
        this.logger.debug(
          `foto de fonte "${foto.fonteFisica}" sem campo correspondente no ` +
            `checklist: adapter nao sera chamado`,
        );
        continue;
      }

      const brutas = await this.extractor.extrair(foto, alvos);
      const campos = new Set(alvos.map((alvo) => alvo.campo));

      for (const leitura of brutas) {
        if (!campos.has(leitura.campo)) {
          this.logger.warn(
            `adapter "${this.extractor.nome}" devolveu campo fora dos alvos ` +
              `("${leitura.campo}") para a fonte "${foto.fonteFisica}"; descartado`,
          );
          continue;
        }

        leituras.push({
          ...leitura,
          fotoEvidenciaId: leitura.fotoEvidenciaId ?? foto.fotoEvidenciaId,
        });
      }
    }

    return leituras;
  }
}
