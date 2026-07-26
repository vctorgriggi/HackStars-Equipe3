import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  AchadoLivre,
  CampoAlvo,
  EXTRACTOR_PORT,
  ExtractorPort,
  FonteImagem,
  LeituraExtraida,
  ResultadoExtracao,
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
   *   inventa campo;
   * - achado livre (texto que o servico leu e nao virou leitura de alvo) sai
   *   junto, com o MESMO carimbo de evidencia. Nao ha filtro de campo aqui —
   *   achado livre nao pertence a checklist nenhuma; quem separa sinal de
   *   ruido e o cruzamento contra o QR, em `conferencias/`.
   */
  async extrairDeFotos(
    fotos: FonteImagem[],
    checklist: AlvoChecklist[],
  ): Promise<ResultadoExtracao> {
    const leituras: LeituraExtraida[] = [];
    const achadosLivres: AchadoLivre[] = [];

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

      // Falha de UMA foto (arquivo corrompido, formato recusado, throttle)
      // não derruba o lote: a foto segue sem leituras e o campo dela vira
      // `nao_conferivel` na engine — é a filosofia do domínio (foto ruim é
      // revisão humana, não 500), e preserva as chamadas já pagas.
      // Uma linha por chamada PAGA: e assim que se conta, no log, quanto uma
      // execucao custou (SPEC, constraint 4) e que um 422 barato nao gastou
      // nada.
      this.logger.debug(
        `chamada-de-visao: adapter "${this.extractor.nome}", foto ` +
          `${foto.fotoEvidenciaId}, fonte "${foto.fonteFisica}", ` +
          `${alvos.length} campo(s)`,
      );

      let bruto: ResultadoExtracao;
      try {
        bruto = await this.extractor.extrair(foto, alvos);
      } catch (erro) {
        this.logger.error(
          `adapter "${this.extractor.nome}" falhou na foto ` +
            `${foto.fotoEvidenciaId} (fonte "${foto.fonteFisica}"): ` +
            `${erro instanceof Error ? erro.message : String(erro)}; ` +
            `a foto segue sem leituras`,
        );
        // Foto que falhou nao tem leitura NEM achado livre: o `continue` cobre
        // os dois canais de uma vez.
        continue;
      }
      const campos = new Set(alvos.map((alvo) => alvo.campo));

      for (const achado of bruto.achadosLivres) {
        achadosLivres.push({
          ...achado,
          fotoEvidenciaId: achado.fotoEvidenciaId ?? foto.fotoEvidenciaId,
        });
      }

      for (const leitura of bruto.leituras) {
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

    return { leituras, achadosLivres };
  }
}
