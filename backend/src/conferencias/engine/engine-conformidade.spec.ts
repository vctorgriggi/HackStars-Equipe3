import { conferir, temLastro } from './engine-conformidade';
import { ItemChecklist, LeituraCampo, OpcoesEngine } from './tipos';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulário de domínio.

const OPCOES: OpcoesEngine = { limiarConfianca: 0.8 };

function item(
  campo: string,
  obrigatorio = true,
  fonteFisica = 'placa',
): ItemChecklist {
  return { campo, fonteFisica, obrigatorio };
}

function leitura(
  campo: string,
  valorLido: string | null,
  confianca: number | null = 0.95,
): LeituraCampo {
  return { campo, valorLido, confianca };
}

describe('conferir — regra 1: normalizacao para comparacao', () => {
  it('should tratar como conforme valores que so diferem por espacos nas bordas', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', '  847233  ')],
      OPCOES,
    );

    expect(resultado.campos[0].veredito).toBe('conforme');
    expect(resultado.vereditoGeral).toBe('conforme');
  });

  it('should colapsar espacos internos multiplos antes de comparar', () => {
    const resultado = conferir(
      [item('cliente-serigrafia-frente', true, 'frente')],
      { 'cliente-serigrafia-frente': '143091 - Energisa Rondonia' },
      [
        leitura(
          'cliente-serigrafia-frente',
          '143091   -    Energisa  Rondonia',
        ),
      ],
      OPCOES,
    );

    expect(resultado.campos[0].veredito).toBe('conforme');
  });

  it('should comparar ignorando caixa alta e baixa', () => {
    const resultado = conferir(
      [item('cliente-serigrafia-frente', true, 'frente')],
      { 'cliente-serigrafia-frente': 'Energisa Rondonia' },
      [leitura('cliente-serigrafia-frente', 'ENERGISA RONDONIA')],
      OPCOES,
    );

    expect(resultado.campos[0].veredito).toBe('conforme');
  });

  it('should preservar os valores originais no resultado, normalizando so a comparacao', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': ' 847233 ' },
      [leitura('serie-placa', '847233  ')],
      OPCOES,
    );

    expect(resultado.campos[0].valorEsperado).toBe(' 847233 ');
    expect(resultado.campos[0].valorLido).toBe('847233  ');
  });

  it('should nao aplicar fuzzy match: um digito diferente ja e divergente', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', '847833')],
      OPCOES,
    );

    expect(resultado.campos[0].veredito).toBe('divergente');
  });
});

describe('conferir — regra 2a: campo sem valor esperado', () => {
  it('should omitir do resultado o campo opcional sem valor esperado', () => {
    const resultado = conferir(
      [
        item('serie-placa'),
        item('potencia-serigrafia-frente', false, 'frente'),
      ],
      { 'serie-placa': '847233' },
      [
        leitura('serie-placa', '847233'),
        leitura('potencia-serigrafia-frente', '10'),
      ],
      OPCOES,
    );

    expect(resultado.campos.map((campo) => campo.campo)).toEqual([
      'serie-placa',
    ]);
    expect(resultado.vereditoGeral).toBe('conforme');
  });

  it('should marcar nao_conferivel com motivo sem-valor-esperado o campo obrigatorio sem valor esperado', () => {
    const resultado = conferir(
      [item('serie-placa')],
      {},
      [leitura('serie-placa', '847233')],
      OPCOES,
    );

    expect(resultado.campos[0]).toMatchObject({
      campo: 'serie-placa',
      valorEsperado: null,
      veredito: 'nao_conferivel',
      motivo: 'sem-valor-esperado',
    });
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should tratar valor esperado vazio ou so com espacos como ausente', () => {
    const resultado = conferir(
      [item('serie-placa'), item('patrimonio-placa')],
      { 'serie-placa': '', 'patrimonio-placa': '   ' },
      [leitura('serie-placa', '847233'), leitura('patrimonio-placa', '251328')],
      OPCOES,
    );

    expect(resultado.campos.map((campo) => campo.motivo)).toEqual([
      'sem-valor-esperado',
      'sem-valor-esperado',
    ]);
  });

  it('should ter precedencia sobre a ausencia de leitura', () => {
    const resultado = conferir([item('serie-placa')], {}, [], OPCOES);

    expect(resultado.campos[0].motivo).toBe('sem-valor-esperado');
  });
});

describe('conferir — regra 2b: sem leitura', () => {
  it('should marcar nao_conferivel com motivo sem-leitura quando nao ha leitura para o campo', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [],
      OPCOES,
    );

    expect(resultado.campos[0]).toMatchObject({
      valorLido: null,
      confianca: null,
      veredito: 'nao_conferivel',
      motivo: 'sem-leitura',
    });
  });

  it('should marcar nao_conferivel quando o valor lido e null', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', null, 0.99)],
      OPCOES,
    );

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('sem-leitura');
  });

  it('should marcar nao_conferivel quando o valor lido e vazio ou so espacos', () => {
    const resultado = conferir(
      [item('serie-placa'), item('patrimonio-placa')],
      { 'serie-placa': '847233', 'patrimonio-placa': '251328' },
      [leitura('serie-placa', ''), leitura('patrimonio-placa', '   ')],
      OPCOES,
    );

    expect(resultado.campos.map((campo) => campo.motivo)).toEqual([
      'sem-leitura',
      'sem-leitura',
    ]);
  });

  it('should ter precedencia sobre a confianca abaixo do limiar', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', null, 0.1)],
      OPCOES,
    );

    expect(resultado.campos[0].motivo).toBe('sem-leitura');
  });
});

describe('conferir — regra 2c: confianca abaixo do limiar', () => {
  it('should marcar nao_conferivel quando a confianca e null', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', '847233', null)],
      OPCOES,
    );

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('confianca-abaixo-do-limiar');
  });

  it('should marcar nao_conferivel quando a confianca e menor que o limiar', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', '847233', 0.79)],
      { limiarConfianca: 0.8 },
    );

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('confianca-abaixo-do-limiar');
  });

  it('should aceitar confianca exatamente igual ao limiar', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', '847233', 0.8)],
      { limiarConfianca: 0.8 },
    );

    expect(resultado.campos[0].veredito).toBe('conforme');
  });

  it('should nunca rebaixar para conforme um valor igual lido com confianca insuficiente', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', '847233', 0.5)],
      OPCOES,
    );

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('confianca-abaixo-do-limiar');
  });

  it('should marcar nao_conferivel tambem quando o valor difere e a confianca e insuficiente', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', '000000', 0.5)],
      OPCOES,
    );

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('confianca-abaixo-do-limiar');
  });

  it('should respeitar o limiar recebido por parametro, sem constante enterrada', () => {
    const leituras = [leitura('serie-placa', '847233', 0.6)];
    const checklist = [item('serie-placa')];
    const esperados = { 'serie-placa': '847233' };

    expect(
      conferir(checklist, esperados, leituras, { limiarConfianca: 0.5 })
        .campos[0].veredito,
    ).toBe('conforme');
    expect(
      conferir(checklist, esperados, leituras, { limiarConfianca: 0.7 })
        .campos[0].veredito,
    ).toBe('nao_conferivel');
  });
});

describe('conferir — regra 2d: comparacao do valor', () => {
  it('should marcar conforme quando o valor normalizado e igual ao esperado', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', '847233')],
      OPCOES,
    );

    expect(resultado.campos[0].veredito).toBe('conforme');
    expect(resultado.campos[0].motivo).toBeUndefined();
  });

  it('should marcar divergente quando o valor normalizado difere do esperado', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [leitura('serie-placa', '847833')],
      OPCOES,
    );

    expect(resultado.campos[0].veredito).toBe('divergente');
    expect(resultado.campos[0].motivo).toBeUndefined();
  });

  it('should repassar fonteFisica, obrigatorio e confianca do par checklist/leitura', () => {
    const resultado = conferir(
      [item('serie-chumbada-topo', true, 'topo')],
      { 'serie-chumbada-topo': '847233' },
      [leitura('serie-chumbada-topo', '847233', 0.91)],
      OPCOES,
    );

    expect(resultado.campos[0]).toEqual({
      campo: 'serie-chumbada-topo',
      fonteFisica: 'topo',
      obrigatorio: true,
      valorEsperado: '847233',
      valorLido: '847233',
      confianca: 0.91,
      veredito: 'conforme',
    });
  });
});

describe('conferir — regra 3: leituras fora do checklist', () => {
  it('should ignorar leitura de campo que nao esta no checklist', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233', 'campo-fantasma': '000' },
      [
        leitura('serie-placa', '847233'),
        leitura('campo-fantasma', '999'),
        leitura('outro-campo-qualquer', null, null),
      ],
      OPCOES,
    );

    expect(resultado.campos).toHaveLength(1);
    expect(resultado.campos[0].campo).toBe('serie-placa');
    expect(resultado.vereditoGeral).toBe('conforme');
  });
});

describe('conferir — regra 4: veredito geral', () => {
  it('should ser conforme quando todos os campos sao conformes', () => {
    const resultado = conferir(
      [item('serie-placa'), item('patrimonio-placa')],
      { 'serie-placa': '847233', 'patrimonio-placa': '251328' },
      [leitura('serie-placa', '847233'), leitura('patrimonio-placa', '251328')],
      OPCOES,
    );

    expect(resultado.vereditoGeral).toBe('conforme');
  });

  it('should ser divergente quando qualquer campo obrigatorio diverge', () => {
    const resultado = conferir(
      [item('serie-placa'), item('patrimonio-placa')],
      { 'serie-placa': '847233', 'patrimonio-placa': '251328' },
      [leitura('serie-placa', '847233'), leitura('patrimonio-placa', '999999')],
      OPCOES,
    );

    expect(resultado.vereditoGeral).toBe('divergente');
  });

  it('should ser divergente quando um campo opcional diverge', () => {
    const resultado = conferir(
      [
        item('serie-placa'),
        item('potencia-serigrafia-frente', false, 'frente'),
      ],
      { 'serie-placa': '847233', 'potencia-serigrafia-frente': '10' },
      [
        leitura('serie-placa', '847233'),
        leitura('potencia-serigrafia-frente', '15'),
      ],
      OPCOES,
    );

    expect(resultado.vereditoGeral).toBe('divergente');
  });

  it('should ser nao_conferivel quando um campo obrigatorio e nao_conferivel', () => {
    const resultado = conferir(
      [item('serie-placa'), item('patrimonio-placa')],
      { 'serie-placa': '847233', 'patrimonio-placa': '251328' },
      [leitura('serie-placa', '847233')],
      OPCOES,
    );

    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should manter conforme quando so um campo opcional e nao_conferivel', () => {
    const resultado = conferir(
      [
        item('serie-placa'),
        item('potencia-serigrafia-frente', false, 'frente'),
      ],
      { 'serie-placa': '847233', 'potencia-serigrafia-frente': '10' },
      [leitura('serie-placa', '847233')],
      OPCOES,
    );

    expect(resultado.vereditoGeral).toBe('conforme');
    expect(resultado.campos[1].veredito).toBe('nao_conferivel');
  });

  it('should dar precedencia a divergente sobre nao_conferivel', () => {
    const resultado = conferir(
      [item('serie-placa'), item('patrimonio-placa')],
      { 'serie-placa': '847233', 'patrimonio-placa': '251328' },
      [leitura('serie-placa', '847833')],
      OPCOES,
    );

    expect(resultado.campos[1].veredito).toBe('nao_conferivel');
    expect(resultado.vereditoGeral).toBe('divergente');
  });

  // INVERSAO DELIBERADA (achado A1 da revisao adversarial). Este teste dizia
  // "should ser conforme para checklist vazia" e CONSAGRAVA o falso OK: zero
  // campo verificado devolvia `conforme`, o veredito mais forte do sistema,
  // sobre uma peca que ninguem olhou. `conforme` agora exige pelo menos um
  // campo conforme.
  it('should ser nao_conferivel para checklist vazia, nunca conforme', () => {
    const resultado = conferir([], {}, [], OPCOES);

    expect(resultado).toEqual({
      vereditoGeral: 'nao_conferivel',
      campos: [],
      incoerencias: [],
    });
  });
});

// Regressao do achado A1: os dois caminhos provados pela revisao para chegar a
// `conforme` sem verificar nada. Inalcancaveis pelo seed de hoje (toda etapa
// tem campo obrigatorio), mas a checklist e DADO — a Fase 6 a escreve com LLM.
describe('conferir — regra 4b: conforme exige campo verificado', () => {
  it('should ser nao_conferivel quando o recorte so tem opcionais sem leitura', () => {
    const resultado = conferir(
      [
        item('serie-placa', false),
        item('potencia-serigrafia-frente', false, 'frente'),
      ],
      { 'serie-placa': '847233', 'potencia-serigrafia-frente': '10 kVA' },
      [],
      OPCOES,
    );

    expect(resultado.campos.map((campo) => campo.veredito)).toEqual([
      'nao_conferivel',
      'nao_conferivel',
    ]);
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should ser nao_conferivel quando todo item opcional e omitido por falta de esperado', () => {
    // O caso mais perigoso: a engine omite opcional sem valor esperado, entao
    // o resultado sai com `campos: []` — e antes saia `conforme`.
    const resultado = conferir(
      [item('potencia-serigrafia-frente', false, 'frente')],
      {},
      [leitura('potencia-serigrafia-frente', '10 kVA')],
      OPCOES,
    );

    expect(resultado.campos).toEqual([]);
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should seguir conforme quando ao menos um campo foi verificado', () => {
    // Contraprova: a guarda nova nao pode rebaixar o caso legitimo do
    // criterio 4 do SPEC (opcional ilegivel nao bloqueia o conforme).
    const resultado = conferir(
      [
        item('serie-placa'),
        item('potencia-serigrafia-frente', false, 'frente'),
      ],
      { 'serie-placa': '847233', 'potencia-serigrafia-frente': '10 kVA' },
      [leitura('serie-placa', '847233')],
      OPCOES,
    );

    expect(resultado.vereditoGeral).toBe('conforme');
  });
});

// Ramo (b2) coberto aqui, e nao so na suite do dedupe (achado M9): o fato
// `conflitante` e ENTRADA da engine, e a engine tem de honra-lo sozinha.
describe('conferir — regra 2b2: leituras conflitantes', () => {
  it('should marcar nao_conferivel com motivo leituras-conflitantes', () => {
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [{ ...leitura('serie-placa', '847233', 0.99), conflitante: true }],
      OPCOES,
    );

    expect(resultado.campos[0]).toMatchObject({
      veredito: 'nao_conferivel',
      motivo: 'leituras-conflitantes',
    });
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should ter precedencia sobre a marcacao de leitura trocada', () => {
    // Decisao registrada: com os dois fatos na mesma leitura vence
    // `leituras-conflitantes`. Os dois dao nao_conferivel — muda so o motivo
    // que o humano le —, e o conflito e mais primario: com duas leituras
    // validas se contradizendo, nem da para afirmar que a vencedora e a
    // marcacao do vizinho.
    const resultado = conferir(
      [item('serie-chumbada-topo', true, 'topo')],
      { 'serie-chumbada-topo': '847233', 'patrimonio-placa': '251328' },
      [
        {
          ...leitura('serie-chumbada-topo', '251328', 0.99),
          conflitante: true,
          trocado: true,
          campoDaLeitura: 'patrimonio-placa',
        },
      ],
      OPCOES,
    );

    expect(resultado.campos[0].motivo).toBe('leituras-conflitantes');
    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
  });

  it('should ter precedencia sobre a confianca abaixo do limiar', () => {
    // (b2) roda antes de (c): duas leituras validas discordando e um fato mais
    // informativo que "esta leitura ficou fraca".
    const resultado = conferir(
      [item('serie-placa')],
      { 'serie-placa': '847233' },
      [{ ...leitura('serie-placa', '847233', 0.5), conflitante: true }],
      OPCOES,
    );

    expect(resultado.campos[0].motivo).toBe('leituras-conflitantes');
  });
});

// M1: a politica de lastro virou uma funcao so, usada pelo ramo (c) da engine e
// pelo dedupe da execucao. Testada direto para que a decisao em aberto do
// "campo parcialmente legivel" tenha um lugar unico onde mudar.
describe('temLastro — politica de confianca compartilhada', () => {
  it('should exigir confianca presente, positiva e >= limiar', () => {
    expect(temLastro(0.9, 0.8)).toBe(true);
    expect(temLastro(0.8, 0.8)).toBe(true);
    expect(temLastro(0.79, 0.8)).toBe(false);
    expect(temLastro(null, 0.8)).toBe(false);
    expect(temLastro(undefined, 0.8)).toBe(false);
  });

  it('should recusar confianca zero mesmo com limiar zero', () => {
    expect(temLastro(0, 0)).toBe(false);
    expect(temLastro(0.01, 0)).toBe(true);
  });
});

describe('conferir — regra 5: ordem dos campos', () => {
  it('should devolver os campos na ordem da checklist, nao na ordem das leituras', () => {
    const checklist = [
      item('serie-chumbada-topo', true, 'topo'),
      item('serie-placa'),
      item('patrimonio-placa'),
    ];
    const resultado = conferir(
      checklist,
      {
        'serie-chumbada-topo': '847233',
        'serie-placa': '847233',
        'patrimonio-placa': '251328',
      },
      [
        leitura('patrimonio-placa', '251328'),
        leitura('serie-placa', '847233'),
        leitura('serie-chumbada-topo', '847233'),
      ],
      OPCOES,
    );

    expect(resultado.campos.map((campo) => campo.campo)).toEqual([
      'serie-chumbada-topo',
      'serie-placa',
      'patrimonio-placa',
    ]);
  });
});

describe('conferir — teste-ancora: peca de demo EPT-163-PI-676', () => {
  const CLIENTE = '143091 - Energisa Rondônia Distribuidora de Energia S.A';

  const checklist: ItemChecklist[] = [
    { campo: 'serie-chumbada-topo', fonteFisica: 'topo', obrigatorio: true },
    {
      campo: 'serie-chumbada-lateral-direita',
      fonteFisica: 'lateral-direita',
      obrigatorio: true,
    },
    {
      campo: 'serie-chumbada-traseira',
      fonteFisica: 'traseira',
      obrigatorio: true,
    },
    { campo: 'serie-placa', fonteFisica: 'placa', obrigatorio: true },
    { campo: 'patrimonio-placa', fonteFisica: 'placa', obrigatorio: true },
    {
      campo: 'patrimonio-serigrafia-frente',
      fonteFisica: 'frente',
      obrigatorio: true,
    },
    {
      campo: 'cliente-serigrafia-frente',
      fonteFisica: 'frente',
      obrigatorio: true,
    },
    {
      campo: 'potencia-serigrafia-frente',
      fonteFisica: 'frente',
      obrigatorio: false,
    },
  ];

  const valoresEsperados: Record<string, string> = {
    'serie-chumbada-topo': '847233',
    'serie-chumbada-lateral-direita': '847233',
    'serie-chumbada-traseira': '847233',
    'serie-placa': '847233',
    'patrimonio-placa': '251328',
    'patrimonio-serigrafia-frente': '251328',
    'cliente-serigrafia-frente': CLIENTE,
    'potencia-serigrafia-frente': '10 kVA',
  };

  // Todas as leituras corretas com confianca 0.95, exceto a serie da placa
  // (lida como 847833, com confianca alta) e a potencia, que nao foi lida.
  const leituras: LeituraCampo[] = [
    leitura('serie-chumbada-topo', '847233'),
    leitura('serie-chumbada-lateral-direita', '847233'),
    leitura('serie-chumbada-traseira', '847233'),
    leitura('serie-placa', '847833', 0.97),
    leitura('patrimonio-placa', '251328'),
    leitura('patrimonio-serigrafia-frente', '251328'),
    leitura('cliente-serigrafia-frente', CLIENTE),
  ];

  const resultado = conferir(checklist, valoresEsperados, leituras, {
    limiarConfianca: 0.9,
  });

  it('should acusar veredito geral divergente', () => {
    expect(resultado.vereditoGeral).toBe('divergente');
  });

  it('should apontar serie-placa como o unico campo divergente', () => {
    const divergentes = resultado.campos
      .filter((campo) => campo.veredito === 'divergente')
      .map((campo) => campo.campo);

    expect(divergentes).toEqual(['serie-placa']);
  });

  it('should manter as tres series chumbadas e os patrimonios conformes', () => {
    const conformes = resultado.campos
      .filter((campo) => campo.veredito === 'conforme')
      .map((campo) => campo.campo);

    expect(conformes).toEqual([
      'serie-chumbada-topo',
      'serie-chumbada-lateral-direita',
      'serie-chumbada-traseira',
      'patrimonio-placa',
      'patrimonio-serigrafia-frente',
      'cliente-serigrafia-frente',
    ]);
  });

  it('should marcar potencia-serigrafia-frente como nao_conferivel sem impedir nada', () => {
    const potencia = resultado.campos.find(
      (campo) => campo.campo === 'potencia-serigrafia-frente',
    );

    expect(potencia).toMatchObject({
      obrigatorio: false,
      veredito: 'nao_conferivel',
      motivo: 'sem-leitura',
    });
  });

  it('should preservar os oito campos da checklist na ordem original', () => {
    expect(resultado.campos.map((campo) => campo.campo)).toEqual(
      checklist.map((itemChecklist) => itemChecklist.campo),
    );
  });

  it('should reportar o valor esperado e o valor lido da serie da placa', () => {
    const seriePlaca = resultado.campos.find(
      (campo) => campo.campo === 'serie-placa',
    );

    expect(seriePlaca).toEqual({
      campo: 'serie-placa',
      fonteFisica: 'placa',
      obrigatorio: true,
      valorEsperado: '847233',
      valorLido: '847833',
      confianca: 0.97,
      veredito: 'divergente',
    });
  });
});

describe('conferir — pureza', () => {
  it('should nao mutar as entradas recebidas', () => {
    const checklist = [item('serie-placa')];
    const valoresEsperados = { 'serie-placa': '847233' };
    const leituras = [leitura('serie-placa', '847833')];
    const copiaChecklist = JSON.parse(JSON.stringify(checklist));
    const copiaEsperados = JSON.parse(JSON.stringify(valoresEsperados));
    const copiaLeituras = JSON.parse(JSON.stringify(leituras));

    conferir(checklist, valoresEsperados, leituras, OPCOES);

    expect(checklist).toEqual(copiaChecklist);
    expect(valoresEsperados).toEqual(copiaEsperados);
    expect(leituras).toEqual(copiaLeituras);
  });

  it('should devolver o mesmo resultado para as mesmas entradas', () => {
    const checklist = [item('serie-placa')];
    const valoresEsperados = { 'serie-placa': '847233' };
    const leituras = [leitura('serie-placa', '847233')];

    expect(conferir(checklist, valoresEsperados, leituras, OPCOES)).toEqual(
      conferir(checklist, valoresEsperados, leituras, OPCOES),
    );
  });
});

// Testes adicionados na rodada de revisão (achados R1: conf=0 e Unicode NFC).
describe('revisão: confiança zero e equivalência Unicode', () => {
  const checklistUm = [
    { campo: 'serie-placa', fonteFisica: 'placa', obrigatorio: true },
  ];

  it('should tratar confianca 0 como nao_conferivel mesmo com limiar 0', () => {
    const resultado = conferir(
      checklistUm,
      { 'serie-placa': '847233' },
      [
        {
          campo: 'serie-placa',
          valorLido: '847233',
          confianca: 0,
        },
      ],
      { limiarConfianca: 0 },
    );
    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should considerar conforme valores NFC e NFD canonicamente equivalentes', () => {
    const nfc = 'Energisa Rondônia'; // ô precomposto
    const nfd = 'Energisa Rondônia'; // o + circunflexo combinante
    const resultado = conferir(
      [
        {
          campo: 'cliente-serigrafia-frente',
          fonteFisica: 'frente',
          obrigatorio: true,
        },
      ],
      { 'cliente-serigrafia-frente': nfc },
      [{ campo: 'cliente-serigrafia-frente', valorLido: nfd, confianca: 0.95 }],
      { limiarConfianca: 0.8 },
    );
    expect(resultado.campos[0].veredito).toBe('conforme');
  });
});
