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

/**
 * Confianca fixa das leituras do mock — acima do limiar padrao do endpoint
 * (`LIMIAR_CONFIANCA_PADRAO = 0.9`, em conferencia-execucao.service.ts).
 */
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
  // Chaves = os `campo` da checklist seedada (vistas da peca, nao numeracao de
  // posicao). Uma vista com duas marcacoes (o topo tem serie chumbada E
  // patrimonio serigrafado) rende DUAS entradas aqui: o mock responde por
  // campo, entao ele nunca reproduz sozinho a ambiguidade que o Textract vive
  // — quem fixa esse comportamento e textract.extractor.spec.ts.
  'serie-chumbada-topo': '847233',
  'serie-chumbada-lateral-direita': '847233',
  'serie-chumbada-traseira': '847233',
  'patrimonio-serigrafia-topo': '251328',
  'patrimonio-serigrafia-frente': '251328',
  'cliente-serigrafia-frente':
    '143091 - Energisa Rondônia Distribuidora de Energia S.A',
  // Marcacao completa do desenho (esperadoFixo '1H - 10 kVA', 2026-07-26):
  // mock desalinhado acusaria potencia pelo motivo errado em toda rodada local.
  'potencia-serigrafia-frente': '1H - 10 kVA',
  'serie-placa': '847833',
  'patrimonio-placa': '251328',
  // QR DA PLACA — a marcacao que o adapter real decodifica localmente, sem
  // AWS (`qr-imagem.ts`). Os valores sao os do payload posicional medido no QR
  // fisico da peca (fixture em `transformadores/qr/qr-payload.parser.spec.ts`),
  // e eles contam a historia inteira do defeito: o QR da placa carrega a serie
  // CORRETA (847233), o numero IMPRESSO na mesma placa diz 847833. Em modo
  // mock a conferencia da placa sai com um `divergente` (serie-placa) e uma
  // INCOERENCIA entre irmaos dentro da propria placa — que e exatamente o que
  // a peca fisica tem.
  'serie-placa-qr': '847233',
  'patrimonio-placa-qr': '251328',
};

export class MockExtractor extends ExtractorPort {
  readonly nome = 'mock';

  /**
   * @param valoresPorCampo mapa `campo -> valorLido`. Campo ausente do mapa
   * sai com `valorLido: null` e `confianca: null` — o mesmo formato de uma
   * leitura que falhou de verdade.
   * @param confianca confianca aplicada a toda leitura com valor.
   * @param textosExtras textos que o mock devolve como achado livre — a UNICA
   * fonte de `achadosLivres` aqui, como no Textract, onde achado livre e o que
   * sobrou depois de os alvos consumirem suas linhas. E assim que um teste
   * simula "a foto tem um numero que ninguem esperava". Vazio por default: em
   * modo demo o mock nao inventa alarme.
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

    // Achado livre e o que a visao leu e NAO virou leitura de campo — no
    // Textract, `achadosDasLinhas` remove justamente as linhas consumidas pelos
    // alvos. Por isso aqui so saem os `textosExtras`: ecoar tambem os valores
    // dos campos (como este mock fazia) invertia o comportamento do adapter
    // real e sustentava teste verde que a producao nao reproduz — com
    // EXTRACTOR_DRIVER=textract o 847833 da placa e consumido como
    // `serie-placa` e nunca chega ao cruzamento (achado A4 da revisao).
    const achadosLivres: AchadoLivre[] = this.textosExtras.map((texto) => ({
      texto,
      confianca: this.confianca,
      regiaoLeitura: null,
      fotoEvidenciaId: fonte.fotoEvidenciaId,
    }));

    return Promise.resolve({ leituras, achadosLivres });
  }
}
