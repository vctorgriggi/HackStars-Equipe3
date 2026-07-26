import { PayloadEtiqueta } from '../transformadores/qr/payload-etiqueta';

import {
  ehItemChecklist,
  montarModosDeComparacao,
  montarValoresEsperados,
  potenciaDaDescricao,
} from './conferencia-execucao.service';
import { conferir } from './engine/engine-conformidade';
import { ItemChecklist } from './engine/tipos';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// Achado M9 da revisao adversarial: `montarValoresEsperados` nao tinha teste
// direto, e e ela que decide de onde vem o valor esperado de cada campo. Regra
// de ouro em jogo: valor esperado que nao veio do payload do QR nao existe
// (SPEC, constraint 5); inventar um seria fabricar a fonte da verdade.
//
// ATUALIZADO em 2026-07-26: 'potencia-*' deixou de ser "campo sem esperado". A
// IDENTIDADE da peca (serie, patrimonio, cliente) continua vindo exclusivamente
// do QR — e e disso que a constraint 5 fala. A potencia nao identifica peca: ela
// e definida pelo DESENHO do modelo, entao o esperado sai do item da checklist
// (`esperadoFixo`) e, na falta dele, da DESCRICAO impressa no proprio payload.
// O que nao pode voltar a existir e o silencio: sem esperado, a engine OMITE o
// item opcional e potencia gravada errada nao aparece em veredito nenhum.

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

  it('should NAO inventar esperado de potencia quando a etiqueta nao traz descricao', () => {
    // A potencia nao e campo do QR. Sem descricao no payload E sem esperado
    // declarado pelo modelo, o campo continua SEM esperado: a engine omite o
    // opcional e marca o obrigatorio como nao_conferivel — nunca conforme.
    const valores = montarValoresEsperados(
      [item('potencia-serigrafia-frente', false)],
      payload(),
    );

    expect(valores).toEqual({});
  });

  it('should derivar o esperado de potencia da DESCRICAO do payload', () => {
    // Fonte honesta: a etiqueta real imprime a potencia dentro da descricao, e o
    // parser do QR ja entrega esse texto. Fallback para checklist antiga, que
    // nao declara `esperadoFixo`.
    const valores = montarValoresEsperados(
      [item('potencia-serigrafia-frente', false)],
      payload({ descricao: 'TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V' }),
    );

    expect(valores).toEqual({ 'potencia-serigrafia-frente': '10 kVA' });
  });

  it('should ignorar descricao sem potencia em kVA', () => {
    const valores = montarValoresEsperados(
      [item('potencia-serigrafia-frente', false)],
      payload({ descricao: 'TRANSFORMADOR DE DISTRIBUICAO' }),
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

// `esperadoFixo` — o esperado que vem do PROJETO, e não do QR (2026-07-26).
//
// A nuance que autoriza isso: a constraint 5 do SPEC ("fonte da verdade única")
// fala da IDENTIDADE da peça — série, patrimônio, cliente —, e essa continua
// vindo exclusivamente do QR. A potência não identifica peça nenhuma: quem a
// define é o DESENHO do modelo (EPT-163-PI-676 pede `1H - 10 kVA` na frente,
// confirmado no crop pelo time), e ProjetoModelo é o desenho virado dado.
// Motivo de negócio: sem esperado a engine OMITIA o item opcional, então
// marcação de potência errada saía em silêncio — e é o que a banca vai testar.
describe('montarValoresEsperados — esperadoFixo: o esperado que o MODELO declara', () => {
  const POTENCIA = 'potencia-serigrafia-frente';

  function itemComEsperadoFixo(
    campo: string,
    esperadoFixo: string,
  ): ItemChecklist {
    return {
      campo,
      fonteFisica: 'frente',
      obrigatorio: false,
      esperadoFixo,
    };
  }

  it('should usar o esperado declarado no item', () => {
    const valores = montarValoresEsperados(
      [itemComEsperadoFixo(POTENCIA, '1H - 10 kVA')],
      payload(),
    );

    expect(valores).toEqual({ [POTENCIA]: '1H - 10 kVA' });
  });

  it('should ter PRECEDENCIA sobre a derivacao pela descricao', () => {
    // A descricao da etiqueta diz '10kVA' e o desenho diz '1H - 10 kVA': o
    // projeto e mais especifico e ganha. O payload nao tem o '1H' em lugar
    // nenhum (a descricao traz '1F', que e outra coisa).
    const valores = montarValoresEsperados(
      [itemComEsperadoFixo(POTENCIA, '1H - 10 kVA')],
      payload({ descricao: 'TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V' }),
    );

    expect(valores).toEqual({ [POTENCIA]: '1H - 10 kVA' });
  });

  it('should tratar esperadoFixo vazio como ausente (cai no fallback)', () => {
    const valores = montarValoresEsperados(
      [itemComEsperadoFixo(POTENCIA, '   ')],
      payload({ descricao: 'TRANSFORMADOR 10kVA 15kV 1F' }),
    );

    expect(valores).toEqual({ [POTENCIA]: '10 kVA' });
  });

  it('should NAO ser usado pela identidade da peca no seed (nem existir la)', () => {
    // Contraprova da constraint 5: item de identidade sem `esperadoFixo`
    // continua lendo do QR, e e assim que o seed declara os campos de serie,
    // patrimonio e cliente.
    const valores = montarValoresEsperados(
      [item('serie-placa'), item('patrimonio-placa')],
      payload(),
    );

    expect(valores).toEqual({
      'serie-placa': '847233',
      'patrimonio-placa': '251328',
    });
  });

  it('should ACUSAR a marcacao errada de potencia (o teste do avaliador)', () => {
    // Ponta a ponta com a engine: peca serigrafada '1H - 20 kVA' onde o desenho
    // pede '1H - 10 kVA'. Campo OPCIONAL divergente conta no veredito geral.
    const checklist = [
      item('serie-placa'),
      itemComEsperadoFixo(POTENCIA, '1H - 10 kVA'),
    ];
    const resultado = conferir(
      checklist,
      montarValoresEsperados(checklist, payload()),
      [
        { campo: 'serie-placa', valorLido: '847233', confianca: 0.999 },
        { campo: POTENCIA, valorLido: '1H-20kVA', confianca: 0.996 },
      ],
      {
        limiarConfianca: 0.9,
        modosPorCampo: montarModosDeComparacao(checklist),
      },
    );

    expect(resultado.campos[1]).toMatchObject({
      campo: POTENCIA,
      valorEsperado: '1H - 10 kVA',
      valorLido: '1H-20kVA',
      veredito: 'divergente',
      obrigatorio: false,
    });
    expect(resultado.vereditoGeral).toBe('divergente');
  });

  it('should aprovar a marcacao certa mesmo com a grafia colada', () => {
    const checklist = [
      item('serie-placa'),
      itemComEsperadoFixo(POTENCIA, '1H - 10 kVA'),
    ];
    const resultado = conferir(
      checklist,
      montarValoresEsperados(checklist, payload()),
      [
        { campo: 'serie-placa', valorLido: '847233', confianca: 0.999 },
        { campo: POTENCIA, valorLido: '1H-10kVA', confianca: 0.996 },
      ],
      {
        limiarConfianca: 0.9,
        modosPorCampo: montarModosDeComparacao(checklist),
      },
    );

    expect(resultado.campos[1].veredito).toBe('conforme');
    expect(resultado.vereditoGeral).toBe('conforme');
  });

  it('should manter o criterio 4 do SPEC: potencia ILEGIVEL nao trava o conforme', () => {
    // O outro lado da moeda, e ele nao pode ter mudado: sem foto da frente (ou
    // com leitura fraca) o campo OPCIONAL fica nao_conferivel e a peca segue
    // conforme.
    const checklist = [
      item('serie-placa'),
      itemComEsperadoFixo(POTENCIA, '1H - 10 kVA'),
    ];
    const resultado = conferir(
      checklist,
      montarValoresEsperados(checklist, payload()),
      [{ campo: 'serie-placa', valorLido: '847233', confianca: 0.999 }],
      {
        limiarConfianca: 0.9,
        modosPorCampo: montarModosDeComparacao(checklist),
      },
    );

    expect(resultado.campos[1]).toMatchObject({
      veredito: 'nao_conferivel',
      motivo: 'sem-leitura',
    });
    expect(resultado.vereditoGeral).toBe('conforme');
  });
});

// A derivacao pela DESCRICAO segue viva como fallback (checklist antiga, que nao
// declara `esperadoFixo`). Ela e a unica origem que nao le um campo proprio do
// QR: a etiqueta imprime a potencia dentro da descricao do produto.
describe('potenciaDaDescricao — a potencia escrita na descricao da etiqueta', () => {
  it('should ler a descricao real da etiqueta da peca de demo', () => {
    expect(
      potenciaDaDescricao('TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V'),
    ).toBe('10 kVA');
  });

  it('should aceitar a unidade separada e em qualquer caixa', () => {
    expect(potenciaDaDescricao('Transformador 10 KVA 15 kV')).toBe('10 kVA');
    expect(potenciaDaDescricao('TRAFO 75  kva')).toBe('75 kVA');
  });

  it('should aceitar potencia decimal', () => {
    expect(potenciaDaDescricao('TRANSFORMADOR 7,5kVA 15kV')).toBe('7,5 kVA');
    expect(potenciaDaDescricao('TRANSFORMADOR 7.5 kVA 15kV')).toBe('7.5 kVA');
  });

  it('should devolver null sem descricao ou sem kVA', () => {
    expect(potenciaDaDescricao(null)).toBeNull();
    expect(potenciaDaDescricao('TRANSFORMADOR 15kV 1F')).toBeNull();
    expect(potenciaDaDescricao('')).toBeNull();
  });

  it('should ficar com a PRIMEIRA ocorrencia', () => {
    // Na descricao real a potencia abre o texto; procurar um segundo kVA exigiria
    // criterio de desempate que ninguem mediu.
    expect(potenciaDaDescricao('TRANSFORMADOR 10kVA / 20kVA')).toBe('10 kVA');
  });
});

// `ehItemChecklist` e a validacao UNICA de item de checklist do sistema (a
// execucao, a releitura do veredito e o plano de fotos passam por ela). A chave
// nova nao pode virar requisito: TODA checklist ja gravada nao a tem.
describe('ehItemChecklist — a chave esperadoFixo entra sem virar exigencia', () => {
  const BASE = {
    campo: 'potencia-serigrafia-frente',
    fonteFisica: 'frente',
    obrigatorio: false,
  };

  it('should aceitar item ANTIGO, sem a chave', () => {
    expect(ehItemChecklist(BASE)).toBe(true);
    expect(ehItemChecklist({ ...BASE, etapa: 'serigrafia' })).toBe(true);
  });

  it('should aceitar esperadoFixo string', () => {
    expect(ehItemChecklist({ ...BASE, esperadoFixo: '1H - 10 kVA' })).toBe(
      true,
    );
  });

  it('should aceitar esperadoFixo null como ausencia (codificacao de JSON)', () => {
    expect(ehItemChecklist({ ...BASE, esperadoFixo: null })).toBe(true);
  });

  it('should recusar esperadoFixo que nao e texto', () => {
    // Numero viraria esperado sem forma definida na comparacao; recusar aqui
    // deixa o erro visivel no boot em vez de calado no veredito.
    expect(ehItemChecklist({ ...BASE, esperadoFixo: 10 })).toBe(false);
    expect(ehItemChecklist({ ...BASE, esperadoFixo: ['1H'] })).toBe(false);
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

  it('should pedir contencao do esperado so para campo de potencia', () => {
    // O modo mais frouxo da engine, e por isso o mapa e explicito: a potencia
    // e uma marcacao COMPOSTA ('1H - 10 kVA') lida junto do resto da face.
    const modos = montarModosDeComparacao([
      item('potencia-serigrafia-frente', false),
      item('serie-placa'),
    ]);

    expect(modos).toEqual({
      'potencia-serigrafia-frente': 'esperado-contido',
      'serie-placa': 'exato',
    });
  });

  it('should ignorar campo de prefixo sem origem no QR', () => {
    // Prefixo que nenhuma origem reconhece nao ganha modo: sem esperado nao ha
    // comparacao, e o default da engine (`exato`) e o criterio mais estrito.
    const modos = montarModosDeComparacao([item('peso-total')]);

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
