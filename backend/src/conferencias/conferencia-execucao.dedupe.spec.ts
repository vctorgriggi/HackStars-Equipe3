import { dedupeLeituras } from './conferencia-execucao.service';
import { conferir } from './engine/engine-conformidade';
import { ItemChecklist, LeituraCampo } from './engine/tipos';

// Regressão do achado ALTA da rodada de análise (2026-07-25): duas leituras
// válidas do mesmo campo com valores diferentes NUNCA podem se resolver
// caladas pela maior confiança — a etiqueta fotografada como "placa" lê
// melhor (100%) que o relevo real (99,8%), e a escolha silenciosa rebaixaria
// o cenário-âncora do SPEC a `conforme`.

const LIMIAR = 0.8;

function leitura(
  campo: string,
  valorLido: string | null,
  confianca: number | null,
): LeituraCampo {
  return { campo, valorLido, confianca };
}

describe('dedupeLeituras', () => {
  it('should refoto legítima: leitura nula + leitura legível ficam com a legível, sem conflito', () => {
    const resultado = dedupeLeituras(
      [
        leitura('serie-placa', null, null),
        leitura('serie-placa', '847833', 0.99),
      ],
      LIMIAR,
    );

    expect(resultado).toHaveLength(1);
    expect(resultado[0].valorLido).toBe('847833');
    expect(resultado[0].conflitante).toBeUndefined();
  });

  it('should cenário-âncora envenenado: placa real 847833 + etiqueta 847233 lida como placa => conflito', () => {
    const resultado = dedupeLeituras(
      [
        leitura('serie-placa', '847833', 0.998),
        leitura('serie-placa', '847233', 1.0),
      ],
      LIMIAR,
    );

    expect(resultado).toHaveLength(1);
    expect(resultado[0].conflitante).toBe(true);
  });

  it('should empate exato de confiança com valores diferentes é conflito nas DUAS ordens (independe do array)', () => {
    const a = [
      leitura('serie-placa', '847233', 0.99),
      leitura('serie-placa', '847833', 0.99),
    ];
    const b = [...a].reverse();

    for (const candidatas of [a, b]) {
      const resultado = dedupeLeituras(candidatas, LIMIAR);
      expect(resultado[0].conflitante).toBe(true);
    }
  });

  it('should mesmo valor com caixa/espaço diferentes NÃO é conflito (normalização da engine)', () => {
    const resultado = dedupeLeituras(
      [
        leitura('cliente-serigrafia-frente', 'ENERGISA', 0.97),
        leitura('cliente-serigrafia-frente', ' energisa ', 0.93),
      ],
      LIMIAR,
    );

    expect(resultado[0].conflitante).toBeUndefined();
  });

  it('should leitura abaixo do limiar discordando é ruído: não veta a leitura válida', () => {
    const resultado = dedupeLeituras(
      [
        leitura('serie-chumbada-topo', '847233', 0.999),
        leitura('serie-chumbada-topo', '841233', 0.354),
      ],
      LIMIAR,
    );

    expect(resultado[0].valorLido).toBe('847233');
    expect(resultado[0].conflitante).toBeUndefined();
  });

  it('should conflito em um campo não contamina os demais', () => {
    const resultado = dedupeLeituras(
      [
        leitura('serie-placa', '847833', 0.998),
        leitura('serie-placa', '847233', 1.0),
        leitura('patrimonio-placa', '847233', 0.997),
      ],
      LIMIAR,
    );

    const patrimonio = resultado.find((l) => l.campo === 'patrimonio-placa');
    expect(patrimonio?.conflitante).toBeUndefined();
  });
});

describe('engine com leitura conflitante', () => {
  const item: ItemChecklist = {
    campo: 'serie-placa',
    fonteFisica: 'placa',
    obrigatorio: true,
  };

  it('should rebaixa para nao_conferivel MESMO quando a vencedora bate com o esperado', () => {
    const resultado = conferir(
      [item],
      { 'serie-placa': '847233' },
      [{ ...leitura('serie-placa', '847233', 1.0), conflitante: true }],
      { limiarConfianca: LIMIAR },
    );

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('leituras-conflitantes');
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should ponta a ponta: dedupe envenenado + engine => nunca conforme', () => {
    const leituras = dedupeLeituras(
      [
        leitura('serie-placa', '847833', 0.998),
        leitura('serie-placa', '847233', 1.0),
      ],
      LIMIAR,
    );
    const resultado = conferir([item], { 'serie-placa': '847233' }, leituras, {
      limiarConfianca: LIMIAR,
    });

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.vereditoGeral).not.toBe('conforme');
  });
});
