import { PayloadEtiqueta } from '../transformadores/qr/payload-etiqueta';

import {
  montarModosDeComparacao,
  montarValoresEsperados,
} from './conferencia-execucao.service';
import { conferir } from './engine/engine-conformidade';
import { ItemChecklist } from './engine/tipos';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// Achado M9 da revisao adversarial: `montarValoresEsperados` nao tinha teste
// direto, e e ela que decide de onde vem o valor esperado de cada campo — logo,
// e ela que decide que 'potencia-*' NAO tem esperado nesta rodada (a potencia
// nao esta no QR). Regra de ouro em jogo: valor esperado que nao veio do
// payload do QR nao existe (SPEC, constraint 5); inventar um seria fabricar a
// fonte da verdade.

function item(campo: string, obrigatorio = true): ItemChecklist {
  return { campo, fonteFisica: 'placa', obrigatorio };
}

function payload(extra: Partial<PayloadEtiqueta> = {}): PayloadEtiqueta {
  return {
    numeroSerie: '847233',
    patrimonio: '251328',
    cliente: '143091 - Energisa Rondônia',
    pedido: null,
    seq: null,
    descricao: null,
    codigoProjeto: null,
    ...extra,
  };
}

describe('montarValoresEsperados — origem do esperado por PREFIXO do campo', () => {
  it('should mandar o numeroSerie do QR para todo campo serie-*', () => {
    const valores = montarValoresEsperados(
      [
        item('serie-placa'),
        item('serie-chumbada-topo'),
        item('serie-chumbada-lateral-direita'),
      ],
      payload(),
    );

    expect(valores).toEqual({
      'serie-placa': '847233',
      'serie-chumbada-topo': '847233',
      'serie-chumbada-lateral-direita': '847233',
    });
  });

  it('should mandar patrimonio e cliente para os prefixos correspondentes', () => {
    const valores = montarValoresEsperados(
      [item('patrimonio-placa'), item('cliente-serigrafia-frente')],
      payload(),
    );

    expect(valores).toEqual({
      'patrimonio-placa': '251328',
      'cliente-serigrafia-frente': '143091 - Energisa Rondônia',
    });
  });

  it('should NAO inventar esperado para potencia-*', () => {
    // A potencia nao viaja no QR. Sem esperado, a engine omite o campo opcional
    // e marca o obrigatorio como nao_conferivel — nunca conforme.
    const valores = montarValoresEsperados(
      [item('potencia-serigrafia-frente', false)],
      payload(),
    );

    expect(valores).toEqual({});
  });

  it('should ignorar campo de prefixo desconhecido', () => {
    const valores = montarValoresEsperados([item('peso-total')], payload());

    expect(valores).toEqual({});
  });

  it('should omitir o campo quando a etiqueta nao traz o dado', () => {
    // Etiqueta sem cliente: o campo fica SEM esperado, e nao com esperado
    // vazio. String vazia compararia "igual a nada" e viraria conforme.
    const valores = montarValoresEsperados(
      [item('cliente-serigrafia-frente'), item('serie-placa')],
      payload({ cliente: null }),
    );

    expect(valores).toEqual({ 'serie-placa': '847233' });
  });

  it('should tratar dado so com espacos como ausente', () => {
    const valores = montarValoresEsperados(
      [item('cliente-serigrafia-frente')],
      payload({ cliente: '   ' }),
    );

    expect(valores).toEqual({});
  });

  it('should nao afirmar conforme para campo obrigatorio sem esperado', () => {
    // Ponta a ponta com a engine: a decisao desta funcao chega ao veredito.
    const checklist = [item('potencia-serigrafia-frente')];
    const resultado = conferir(
      checklist,
      montarValoresEsperados(checklist, payload()),
      [
        {
          campo: 'potencia-serigrafia-frente',
          valorLido: '10 kVA',
          confianca: 0.99,
        },
      ],
      { limiarConfianca: 0.9 },
    );

    expect(resultado.campos[0].motivo).toBe('sem-valor-esperado');
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });
});

// O MODO de comparacao sai da MESMA tabela de prefixos que o valor esperado
// (`ORIGENS_DO_ESPERADO`): quem diz de onde vem o esperado e quem sabe como ele
// se parece na peca. A engine nao conhece prefixo nenhum — ela recebe o mapa.
describe('montarModosDeComparacao — o criterio de igualdade por PREFIXO', () => {
  it('should pedir contencao de token so para campo de cliente', () => {
    const modos = montarModosDeComparacao([
      item('cliente-serigrafia-frente'),
      item('serie-placa'),
      item('serie-chumbada-topo'),
      item('patrimonio-placa'),
    ]);

    expect(modos).toEqual({
      'cliente-serigrafia-frente': 'contem-token',
      'serie-placa': 'exato',
      'serie-chumbada-topo': 'exato',
      'patrimonio-placa': 'exato',
    });
  });

  it('should ignorar campo de prefixo sem origem no QR', () => {
    // Sem valor esperado nao ha comparacao — logo, nao ha modo a declarar.
    const modos = montarModosDeComparacao([
      item('potencia-serigrafia-frente', false),
      item('peso-total'),
    ]);

    expect(modos).toEqual({});
  });

  it('should fechar o divergente FALSO do cliente sem tocar no cenario-ancora', () => {
    // Ponta a ponta com a engine, com o caso medido em 2026-07-26 no ar: a
    // serigrafia traz a MARCA, o QR traz a razao social com codigo.
    const checklist = [item('cliente-serigrafia-frente'), item('serie-placa')];
    const etiqueta = payload({
      cliente: '143091 - Energisa Rondônia Distribuidora de Energia S.A',
    });

    const resultado = conferir(
      checklist,
      montarValoresEsperados(checklist, etiqueta),
      [
        {
          campo: 'cliente-serigrafia-frente',
          valorLido: 'energisa',
          confianca: 0.9967,
        },
        { campo: 'serie-placa', valorLido: '847833', confianca: 0.999 },
      ],
      {
        limiarConfianca: 0.9,
        modosPorCampo: montarModosDeComparacao(checklist),
      },
    );

    expect(resultado.campos[0].veredito).toBe('conforme');
    expect(resultado.campos[1].veredito).toBe('divergente');
    expect(resultado.vereditoGeral).toBe('divergente');
  });
});
