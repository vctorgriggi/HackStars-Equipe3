import { AchadoLivre } from '../extracao/ports/extractor.port';
import { PayloadEtiqueta } from '../transformadores/qr/payload-etiqueta';

import { cruzarAchados } from './conferencia-extracao.service';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// `cruzarAchados` e PURA (sem Nest, sem I/O), como `dedupeLeituras` e
// `filtrarChecklistPorEtapa`. O que esta suite protege e a HEURISTICA
// ANTI-RUIDO: a placa de um transformador tem dezenas de numeros tecnicos, e
// alarme que dispara em todos e alarme que ninguem le.

/** Etiqueta da peca de demo. */
const PAYLOAD: PayloadEtiqueta = {
  numeroSerie: '847233',
  patrimonio: '251328',
  cliente: '143091 - Energisa Rondônia Distribuidora de Energia S.A',
  pedido: '408136',
  seq: '3',
  descricao: 'Transformador 10 kVA',
  codigoProjeto: 'EPT-163-PI-676',
};

function achado(texto: string, extras: Partial<AchadoLivre> = {}): AchadoLivre {
  return {
    texto,
    confianca: 0.99,
    regiaoLeitura: null,
    fotoEvidenciaId: 'foto-placa',
    ...extras,
  };
}

describe('cruzarAchados — candidato a identificador', () => {
  it('should alarmar o numero de mesmo formato que nao esta no QR', () => {
    const alarmes = cruzarAchados([achado('847833')], PAYLOAD);

    expect(alarmes.map((alarme) => alarme.texto)).toEqual(['847833']);
  });

  it('should ignorar numero de comprimento diferente dos identificadores', () => {
    // '13800' (tensao) e '10' (kVA) sao o ruido tipico de uma placa: 5 e 2
    // digitos contra os 6 do QR.
    expect(
      cruzarAchados(
        [achado('13800'), achado('10'), achado('2024'), achado('84723399')],
        PAYLOAD,
      ),
    ).toEqual([]);
  });

  it('should ignorar texto que nao e composto so de digitos', () => {
    expect(
      cruzarAchados(
        [
          achado('ABNT NBR 5356'),
          achado('13.8 kV'),
          achado('847 833'),
          achado('N° 847833'),
          achado('EPT-163-PI-676'),
        ],
        PAYLOAD,
      ),
    ).toEqual([]);
  });

  it('should derivar o comprimento do proprio payload, nunca de constante', () => {
    // Cliente com serie/patrimonio de 7 digitos: o alarme acompanha, e o
    // numero de 6 (que seria alvo na TRAEL) deixa de ser candidato.
    const outroCliente: PayloadEtiqueta = {
      ...PAYLOAD,
      numeroSerie: '1847233',
      patrimonio: '1251328',
    };

    const alarmes = cruzarAchados(
      [achado('847833'), achado('9999999')],
      outroCliente,
    );

    expect(alarmes.map((alarme) => alarme.texto)).toEqual(['9999999']);
  });
});

describe('cruzarAchados — consistente com o QR nao alarma', () => {
  it('should aceitar em silencio o numero que e a serie ou o patrimonio', () => {
    expect(
      cruzarAchados([achado('847233'), achado('251328')], PAYLOAD),
    ).toEqual([]);
  });

  it('should aceitar numero que bate com outro campo da etiqueta', () => {
    // '408136' e o pedido: a etiqueta afirma esse numero, entao ve-lo na peca
    // nao e inconsistencia — ainda que nenhuma checklist o confira.
    expect(cruzarAchados([achado('408136')], PAYLOAD)).toEqual([]);
  });

  it('should comparar com a normalizacao da engine (espaco e caixa)', () => {
    expect(cruzarAchados([achado('  847233  ')], PAYLOAD)).toEqual([]);
  });
});

describe('cruzarAchados — dedupe por texto normalizado', () => {
  it('should juntar em um alarme o mesmo numero lido em varios blocos', () => {
    const alarmes = cruzarAchados(
      [
        achado('847833', { fotoEvidenciaId: 'foto-1', confianca: 0.99 }),
        achado('847833', { fotoEvidenciaId: 'foto-2', confianca: 0.71 }),
        achado(' 847833 ', { fotoEvidenciaId: 'foto-3', confianca: 0.88 }),
      ],
      PAYLOAD,
    );

    expect(alarmes).toHaveLength(1);
    expect(alarmes[0].texto).toBe('847833');
    expect(alarmes[0].ocorrencias).toEqual([
      { fotoEvidenciaId: 'foto-1', confianca: 0.99, regiaoLeitura: null },
      { fotoEvidenciaId: 'foto-2', confianca: 0.71, regiaoLeitura: null },
      { fotoEvidenciaId: 'foto-3', confianca: 0.88, regiaoLeitura: null },
    ]);
  });

  it('should manter alarmes distintos para numeros distintos', () => {
    const alarmes = cruzarAchados(
      [achado('847833'), achado('999999'), achado('847833')],
      PAYLOAD,
    );

    expect(alarmes.map((alarme) => alarme.texto)).toEqual(['847833', '999999']);
    expect(alarmes[0].ocorrencias).toHaveLength(2);
  });

  it('should preservar a regiao lida como evidencia do alarme', () => {
    const regiao = JSON.stringify({ Left: 0.1, Top: 0.2 });

    const [alarme] = cruzarAchados(
      [achado('847833', { regiaoLeitura: regiao })],
      PAYLOAD,
    );

    expect(alarme.ocorrencias[0].regiaoLeitura).toBe(regiao);
  });

  it('should aceitar achado sem vinculo de foto sem quebrar', () => {
    const [alarme] = cruzarAchados(
      [{ texto: '847833', confianca: 0 }],
      PAYLOAD,
    );

    expect(alarme.ocorrencias[0]).toEqual({
      fotoEvidenciaId: null,
      confianca: 0,
      regiaoLeitura: null,
    });
  });
});

describe('cruzarAchados — payload incompleto', () => {
  it('should usar so o numeroSerie quando a etiqueta nao traz patrimonio', () => {
    const semPatrimonio: PayloadEtiqueta = { ...PAYLOAD, patrimonio: '' };

    const alarmes = cruzarAchados(
      [achado('847233'), achado('251328')],
      semPatrimonio,
    );

    // 251328 deixa de ser "esperado": a etiqueta nao o afirma em lugar nenhum.
    expect(alarmes.map((alarme) => alarme.texto)).toEqual(['251328']);
  });

  it('should ignorar identificador nao numerico ao montar o molde', () => {
    const patrimonioAlfanumerico: PayloadEtiqueta = {
      ...PAYLOAD,
      patrimonio: 'PAT-2513',
    };

    // Molde = so os 6 digitos do numeroSerie; '25132845' (8) nao e candidato.
    expect(
      cruzarAchados(
        [achado('847833'), achado('25132845')],
        patrimonioAlfanumerico,
      ).map((alarme) => alarme.texto),
    ).toEqual(['847833']);
  });

  it('should ficar em silencio quando nenhum identificador do QR e numerico', () => {
    const semNumeros: PayloadEtiqueta = {
      ...PAYLOAD,
      numeroSerie: 'SER-847233',
      patrimonio: 'PAT-251328',
    };

    // Sem molde, nao ha candidato: chutar formato seria inventar alarme.
    expect(cruzarAchados([achado('847833')], semNumeros)).toEqual([]);
  });

  it('should ficar em silencio quando a visao nao achou nada', () => {
    expect(cruzarAchados([], PAYLOAD)).toEqual([]);
  });
});
