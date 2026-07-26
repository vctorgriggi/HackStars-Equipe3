import { marcarLeiturasTrocadas } from './conferencia-execucao.service';
import { conferir } from './engine/engine-conformidade';
import { ItemChecklist, LeituraCampo } from './engine/tipos';

// Regressao do caso medido em campo (2026-07-25): foto da tampa de cima
// mostrando o patrimonio SERIGRAFADO (tinta preta) e a serie CHUMBADA
// (relevo da cor do tanque). O Textract enxergou so a tinta e casou o
// patrimonio com o campo `serie-chumbada-1` — que virava `divergente`,
// acusando uma peca correta.

const LIMIAR = 0.8;

// Valores reais da peca de demonstracao.
const SERIE = '847233';
const PATRIMONIO = '251328';
const SERIE_DA_PLACA_DEFEITUOSA = '847833';

const ESPERADOS: Record<string, string> = {
  'serie-chumbada-1': SERIE,
  'serie-placa': SERIE,
  'patrimonio-placa': PATRIMONIO,
  'patrimonio-serigrafia': PATRIMONIO,
};

function leitura(
  campo: string,
  valorLido: string | null,
  confianca = 0.98,
): LeituraCampo {
  return { campo, valorLido, confianca };
}

function item(campo: string, fonteFisica: string): ItemChecklist {
  return { campo, fonteFisica, obrigatorio: true };
}

describe('marcarLeiturasTrocadas', () => {
  it('should marcar a leitura que traz o esperado de OUTRO campo', () => {
    const [marcada] = marcarLeiturasTrocadas(
      [leitura('serie-chumbada-1', PATRIMONIO)],
      ESPERADOS,
      LIMIAR,
    );

    expect(marcada.trocado).toBe(true);
  });

  it('should dizer COM QUAL campo a leitura casou', () => {
    // Achado A3(ii): sem isto o humano sabe "leitura de outro campo" e nao de
    // qual — e e essa informacao que separa "a foto pegou a marcacao vizinha"
    // (reenquadrar) de "a peca foi gravada com o numero errado" (NC real).
    const [marcada] = marcarLeiturasTrocadas(
      [leitura('serie-chumbada-1', PATRIMONIO)],
      ESPERADOS,
      LIMIAR,
    );

    expect(marcada.campoDaLeitura).toBe('patrimonio-placa');
  });

  it('should deixar intacta a leitura que bate com o proprio campo', () => {
    const [marcada] = marcarLeiturasTrocadas(
      [leitura('serie-chumbada-1', SERIE)],
      ESPERADOS,
      LIMIAR,
    );

    expect(marcada.trocado).toBeUndefined();
    expect(marcada.campoDaLeitura).toBeUndefined();
  });

  it('should NAO marcar a divergencia real da peca de demo (847833)', () => {
    // O valor da placa defeituosa nao e o esperado de campo nenhum: e
    // divergencia de verdade e tem de continuar sendo.
    const [marcada] = marcarLeiturasTrocadas(
      [leitura('serie-placa', SERIE_DA_PLACA_DEFEITUOSA)],
      ESPERADOS,
      LIMIAR,
    );

    expect(marcada.trocado).toBeUndefined();
  });

  it('should ignorar leitura vazia ou nula', () => {
    const marcadas = marcarLeiturasTrocadas(
      [leitura('serie-chumbada-1', null), leitura('serie-placa', '   ')],
      ESPERADOS,
      LIMIAR,
    );

    expect(marcadas.every((atual) => atual.trocado === undefined)).toBe(true);
  });

  it('should nao marcar quando serie e patrimonio sao iguais no QR', () => {
    // Peca cujo QR traz o mesmo numero nos dois campos: a leitura bate com o
    // proprio campo e a guarda nao tem o que desconfiar.
    const [marcada] = marcarLeiturasTrocadas(
      [leitura('serie-chumbada-1', SERIE)],
      { 'serie-chumbada-1': SERIE, 'patrimonio-placa': SERIE },
      LIMIAR,
    );

    expect(marcada.trocado).toBeUndefined();
  });

  it('should NAO marcar leitura sem lastro (achado A3)', () => {
    // Caso medido: 251328 @ 0.35 num campo de serie. A causa e a foto ruim, nao
    // o enquadramento — leitura sem lastro nao afirma nada sobre campo nenhum,
    // nem sobre o vizinho.
    const [marcada] = marcarLeiturasTrocadas(
      [leitura('serie-chumbada-1', PATRIMONIO, 0.35)],
      ESPERADOS,
      LIMIAR,
    );

    expect(marcada.trocado).toBeUndefined();
  });

  it('should NAO marcar leitura sem confianca informada', () => {
    const [marcada] = marcarLeiturasTrocadas(
      [{ campo: 'serie-chumbada-1', valorLido: PATRIMONIO, confianca: null }],
      ESPERADOS,
      LIMIAR,
    );

    expect(marcada.trocado).toBeUndefined();
  });
});

describe('engine com leitura trocada', () => {
  const checklist = [item('serie-chumbada-1', 'chumbado-1')];

  it('should virar nao_conferivel com motivo leitura-de-outro-campo', () => {
    const leituras = marcarLeiturasTrocadas(
      [leitura('serie-chumbada-1', PATRIMONIO)],
      ESPERADOS,
      LIMIAR,
    );
    const resultado = conferir(checklist, ESPERADOS, leituras, {
      limiarConfianca: LIMIAR,
    });

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('leitura-de-outro-campo');
  });

  it('should levar ate o resultado o campo com que a leitura casou', () => {
    const leituras = marcarLeiturasTrocadas(
      [leitura('serie-chumbada-1', PATRIMONIO)],
      ESPERADOS,
      LIMIAR,
    );
    const resultado = conferir(checklist, ESPERADOS, leituras, {
      limiarConfianca: LIMIAR,
    });

    expect(resultado.campos[0].campoDaLeitura).toBe('patrimonio-placa');
  });

  it('should NUNCA promover a conforme por causa da guarda', () => {
    // A guarda so desconfia: nenhum caminho dela produz `conforme`.
    const leituras = marcarLeiturasTrocadas(
      [leitura('serie-chumbada-1', PATRIMONIO)],
      ESPERADOS,
      LIMIAR,
    );
    const resultado = conferir(checklist, ESPERADOS, leituras, {
      limiarConfianca: LIMIAR,
    });

    expect(resultado.vereditoGeral).not.toBe('conforme');
  });

  it('should preservar o cenario-ancora: placa 847833 segue divergente', () => {
    const checklistPlaca = [item('serie-placa', 'placa')];
    const leituras = marcarLeiturasTrocadas(
      [leitura('serie-placa', SERIE_DA_PLACA_DEFEITUOSA)],
      ESPERADOS,
      LIMIAR,
    );
    const resultado = conferir(checklistPlaca, ESPERADOS, leituras, {
      limiarConfianca: LIMIAR,
    });

    expect(resultado.campos[0].veredito).toBe('divergente');
    expect(resultado.vereditoGeral).toBe('divergente');
  });

  it('should acusar a foto ruim como confianca-abaixo-do-limiar, nao como troca', () => {
    // Achado A3(i) ponta a ponta: 251328 @ 0.35 num campo de serie. O motivo
    // tem de apontar a causa REAL (a foto), senao o operador vai reenquadrar
    // uma marcacao que esta certa.
    const leituras = marcarLeiturasTrocadas(
      [leitura('serie-chumbada-1', PATRIMONIO, 0.35)],
      ESPERADOS,
      LIMIAR,
    );
    const resultado = conferir(checklist, ESPERADOS, leituras, {
      limiarConfianca: LIMIAR,
    });

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('confianca-abaixo-do-limiar');
    expect(resultado.campos[0].campoDaLeitura).toBeUndefined();
  });
});
