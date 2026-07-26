import {
  AchadoLivre,
  CampoAlvo,
  ExtractorPort,
  FonteImagem,
  ResultadoExtracao,
} from '../ports/extractor.port';

/**
 * Extrator deterministico. Dois papeis:
 *
 * 1. teste — nenhuma suite toca AWS;
 * 2. driver default (`EXTRACTOR_DRIVER=mock`) — o sistema sobe e roda uma
 *    conferencia ponta a ponta sem credencial nenhuma.
 *
 * Nao ha rede, nao ha latencia e nao ha custo: a mesma foto sempre devolve a
 * mesma leitura.
 */

/** Confianca fixa das leituras do mock (acima do limiar padrao de 0.8). */
export const CONFIANCA_MOCK = 0.99;

/**
 * Leituras da peca de demo (desenho EPT-163-PI-676), por `campo` da checklist.
 *
 * O mock ESPELHA a peca fisica real: chumbadas e etiqueta dizem `847233`, mas
 * a placa foi gravada `847833` — entao a conferencia em modo mock reproduz o
 * cenario-ancora do SPEC (vereditoGeral divergente, apontando so serie-placa),
 * a mesma historia que a demo conta com visao real. Para simular outros casos
 * (tudo conforme, peca ilegivel), passe o mapa desejado no construtor.
 */
export const LEITURAS_DEMO: Record<string, string | null> = {
  'serie-chumbada-1': '847233',
  'serie-chumbada-2': '847233',
  'serie-chumbada-3': '847233',
  'serie-placa': '847833',
  'patrimonio-placa': '251328',
  'patrimonio-serigrafia': '251328',
  'cliente-serigrafia':
    '143091 - Energisa Rondônia Distribuidora de Energia S.A',
  'potencia-serigrafia': '10 kVA',
};

export class MockExtractor extends ExtractorPort {
  readonly nome = 'mock';

  /**
   * @param valoresPorCampo mapa `campo -> valorLido`. Campo ausente do mapa
   * sai com `valorLido: null` e `confianca: null` — o mesmo formato de uma
   * leitura que falhou de verdade.
   * @param confianca confianca aplicada a toda leitura com valor.
   * @param textosExtras textos que o mock devolve APENAS como achado livre
   * (nunca como leitura de campo) — e assim que um teste simula "a foto tem um
   * numero que ninguem esperava". Vazio por default: em modo demo o mock nao
   * inventa alarme.
   */
  constructor(
    private readonly valoresPorCampo: Record<
      string,
      string | null
    > = LEITURAS_DEMO,
    private readonly confianca: number = CONFIANCA_MOCK,
    private readonly textosExtras: string[] = [],
  ) {
    super();
  }

  extrair(fonte: FonteImagem, alvos: CampoAlvo[]): Promise<ResultadoExtracao> {
    const leituras = alvos.map((alvo) => {
      const valorLido = this.valoresPorCampo[alvo.campo] ?? null;

      return {
        campo: alvo.campo,
        valorLido,
        confianca: valorLido === null ? null : this.confianca,
        regiaoLeitura: null,
        fotoEvidenciaId: fonte.fotoEvidenciaId,
      };
    });

    // Espelha o Textract: o que o servico "viu" na foto inclui os proprios
    // valores lidos. Nao ha texto inventado — no fluxo de demonstracao os
    // achados batem com o QR e o cruzamento sai vazio; a excecao e a placa da
    // peca de demo (847833), que e inconsistente na peca FISICA e por isso
    // deve mesmo alarmar.
    const achadosLivres: AchadoLivre[] = [
      ...leituras
        .filter((leitura) => leitura.valorLido !== null)
        .map((leitura) => ({
          texto: leitura.valorLido as string,
          confianca: this.confianca,
          regiaoLeitura: null,
          fotoEvidenciaId: fonte.fotoEvidenciaId,
        })),
      ...this.textosExtras.map((texto) => ({
        texto,
        confianca: this.confianca,
        regiaoLeitura: null,
        fotoEvidenciaId: fonte.fotoEvidenciaId,
      })),
    ];

    return Promise.resolve({ leituras, achadosLivres });
  }
}
