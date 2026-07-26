import { exigirCorroboracaoDeRelevo } from './conferencia-execucao.service';
import { conferir } from './engine/engine-conformidade';
import { ItemChecklist, LeituraCampo } from './engine/tipos';

// A regra "antes de acusar, confirme" na PORTA DE ENTRADA da execucao: leitura
// de relevo que chega sem segunda evidencia — digitada, vinda do driver `mock`
// ou de um adapter que nao conseguiu recortar — e tratada como
// `nao-confirmada`. Sem isto, a mesma peca seria acusada por uma porta e nao
// pela outra, e a porta frouxa seria a que ninguem mede.

const LIMIAR = 0.9;
const SERIE = '847233';
const SERIE_ERRADA = '847833';

const ESPERADOS: Record<string, string> = {
  'serie-chumbada-traseira': SERIE,
  'serie-placa': SERIE,
};

function leitura(
  campo: string,
  valorLido: string | null,
  extras: Partial<LeituraCampo> = {},
): LeituraCampo {
  return { campo, valorLido, confianca: 0.98, ...extras };
}

function item(campo: string, fonteFisica: string): ItemChecklist {
  return { campo, fonteFisica, obrigatorio: true };
}

describe('exigirCorroboracaoDeRelevo', () => {
  it('should marcar como nao-confirmada a leitura de relevo que chega crua', () => {
    const [marcada] = exigirCorroboracaoDeRelevo([
      leitura('serie-chumbada-traseira', SERIE_ERRADA),
    ]);

    expect(marcada.corroboracao).toBe('nao-confirmada');
  });

  it('should preservar a corroboracao que o adapter ja produziu', () => {
    const [marcada] = exigirCorroboracaoDeRelevo([
      leitura('serie-chumbada-traseira', SERIE_ERRADA, {
        corroboracao: 'confirmada',
      }),
    ]);

    expect(marcada.corroboracao).toBe('confirmada');
  });

  it('should deixar intacta a leitura de marcacao impressa', () => {
    const [marcada] = exigirCorroboracaoDeRelevo([
      leitura('serie-placa', SERIE_ERRADA),
    ]);

    expect(marcada.corroboracao).toBeUndefined();
  });

  it('should deixar intacta a leitura vazia', () => {
    // Campo que ninguem leu nao acusa nada: o motivo honesto dele continua
    // sendo `sem-leitura`.
    const marcadas = exigirCorroboracaoDeRelevo([
      leitura('serie-chumbada-traseira', null),
      leitura('serie-chumbada-traseira', '   '),
    ]);

    expect(marcadas.every((atual) => atual.corroboracao === undefined)).toBe(
      true,
    );
  });
});

describe('leitura digitada de relevo nao acusa a peca', () => {
  it('should sair nao_conferivel quando o chumbado digitado diverge', () => {
    const leituras = exigirCorroboracaoDeRelevo([
      leitura('serie-chumbada-traseira', SERIE_ERRADA),
    ]);
    const resultado = conferir(
      [item('serie-chumbada-traseira', 'traseira')],
      ESPERADOS,
      leituras,
      { limiarConfianca: LIMIAR },
    );

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('leitura-nao-corroborada');
  });

  it('should manter o cenario-ancora: a placa digitada segue divergente', () => {
    const leituras = exigirCorroboracaoDeRelevo([
      leitura('serie-placa', SERIE_ERRADA, { confianca: 0.999 }),
    ]);
    const resultado = conferir(
      [item('serie-placa', 'placa')],
      ESPERADOS,
      leituras,
      { limiarConfianca: LIMIAR },
    );

    expect(resultado.campos[0].veredito).toBe('divergente');
    expect(resultado.vereditoGeral).toBe('divergente');
  });
});
