import {
  DISCLAIMER_LAUDO,
  FatosDoLaudo,
  RedatorPort,
} from '../ports/redator.port';

/**
 * Redator DETERMINISTICO, sem AWS. Existe para os testes e para bancada
 * offline — nao para producao.
 *
 * Ao contrario do `MockExtractor`, este NAO e o driver padrao: o padrao do
 * laudo e o Bedrock real (`adapters/redator.factory.ts` explica por que). Um
 * laudo simulado servido em silencio seria pior que erro nenhum — texto em
 * prosa parece autoral, e o leitor nao tem como saber que a IA nunca rodou. Por
 * isso o texto daqui se ANUNCIA como simulado na primeira linha, e a resposta
 * da API carrega `modelo: "mock"`.
 *
 * Ele monta o texto a partir dos MESMOS fatos que o adapter real recebe: se um
 * campo divergente entra, ele aparece no laudo. Assim o teste de ponta a ponta
 * verifica a montagem dos fatos, e nao um texto fixo.
 */
export class MockRedator extends RedatorPort {
  readonly nome = 'mock';

  readonly modelo = 'mock';

  redigirLaudo(fatos: FatosDoLaudo): Promise<string> {
    const { contagens, peca } = fatos;

    const escopo = fatos.etapaAvaliada
      ? `no gate "${fatos.etapaAvaliada}" (não cobre a peça inteira)`
      : 'na checklist inteira da peça';

    const divergentes = fatos.campos
      .filter((campo) => campo.veredito === 'divergente')
      .map(
        (campo) =>
          `${campo.campo} (etiqueta ${campo.valorEsperado || '—'}, peça ${campo.valorLido ?? 'não lido'})`,
      );

    const naoConferiveis = fatos.campos
      .filter((campo) => campo.veredito === 'nao_conferivel')
      .map((campo) => campo.campo);

    const paragrafos = [
      `LAUDO SIMULADO (sem IA — driver de redação em modo mock). Peça de ` +
        `número de série ${peca.numeroSerie || '—'}, patrimônio ` +
        `${peca.patrimonio || '—'}, cliente ${peca.cliente || '—'}. Veredito ` +
        `geral ${fatos.vereditoGeral ?? 'não gravado'}, apurado ${escopo}.`,
      `Foram conferidos ${contagens.total} campos: ${contagens.conformes} ` +
        `conformes, ${contagens.divergentes} divergentes e ` +
        `${contagens.naoConferiveis} não conferíveis.` +
        (divergentes.length > 0
          ? ` Divergências: ${divergentes.join('; ')}.`
          : '') +
        (naoConferiveis.length > 0
          ? ` Exigem conferência humana com a foto: ${naoConferiveis.join(', ')}.`
          : ''),
      DISCLAIMER_LAUDO,
    ];

    return Promise.resolve(paragrafos.join('\n\n'));
  }
}
