import { detectarIncoerencias } from './coerencia';
import { conferir } from './engine-conformidade';
import {
  ItemChecklist,
  LeituraCampo,
  MotivoCampo,
  ResultadoCampo,
  Veredito,
} from './tipos';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// CONFERENCIA DE COERENCIA ENTRE CAMPOS IRMAOS. O numero de serie e gravado 3x
// no metal de proposito (redundancia fisica da fabrica) e uma quarta vez na
// placa: os quatro campos esperam o MESMO numero do QR. Ate esta rodada cada um
// era julgado isolado e a informacao "as posicoes discordam ENTRE SI" se
// perdia.
//
// Caso medido em 2026-07-25: foto lateral leu 847833 (84,6%) onde as outras
// duas posicoes leram 847233 (98,8%). Um humano ve na hora qual posicao
// re-inspecionar; o sistema nao via.

const SERIE = '847233';
const SERIE_DA_PLACA_DEFEITUOSA = '847833';
const PATRIMONIO = '251328';
const LIMIAR = 0.9;

/** Constroi um `ResultadoCampo` como a engine o devolveria. */
function campo(
  nome: string,
  valorLido: string | null,
  opcoes: {
    valorEsperado?: string | null;
    confianca?: number | null;
    veredito?: Veredito;
    motivo?: MotivoCampo;
    fonteFisica?: string;
    obrigatorio?: boolean;
  } = {},
): ResultadoCampo {
  return {
    campo: nome,
    fonteFisica: opcoes.fonteFisica ?? 'chumbado-1',
    obrigatorio: opcoes.obrigatorio ?? true,
    valorEsperado:
      opcoes.valorEsperado === undefined ? SERIE : opcoes.valorEsperado,
    valorLido,
    confianca: opcoes.confianca ?? 0.99,
    veredito: opcoes.veredito ?? 'conforme',
    ...(opcoes.motivo === undefined ? {} : { motivo: opcoes.motivo }),
  };
}

describe('detectarIncoerencias — descoberta do grupo e discordancia', () => {
  it('should nao gerar nada quando as tres posicoes concordam', () => {
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE),
      campo('serie-chumbada-2', SERIE),
      campo('serie-chumbada-3', SERIE),
    ]);

    expect(incoerencias).toEqual([]);
  });

  it('should acusar a posicao que discorda das irmas (caso medido: 847833 a 84,6%)', () => {
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE, { confianca: 0.988 }),
      campo('serie-chumbada-2', SERIE, { confianca: 0.988 }),
      campo('serie-chumbada-3', SERIE_DA_PLACA_DEFEITUOSA, {
        confianca: 0.846,
        veredito: 'nao_conferivel',
        motivo: 'confianca-abaixo-do-limiar',
      }),
    ]);

    expect(incoerencias).toHaveLength(1);
    expect(incoerencias[0].valorEsperado).toBe(SERIE);
    expect(incoerencias[0].campos).toEqual([
      'serie-chumbada-1',
      'serie-chumbada-2',
      'serie-chumbada-3',
    ]);
    expect(incoerencias[0].valoresLidos).toEqual([
      SERIE,
      SERIE_DA_PLACA_DEFEITUOSA,
    ]);
  });

  it('should levar confianca e veredito de cada posicao para o humano decidir', () => {
    const [incoerencia] = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE, { confianca: 0.988 }),
      campo('serie-chumbada-2', SERIE_DA_PLACA_DEFEITUOSA, {
        confianca: 0.846,
        veredito: 'nao_conferivel',
        motivo: 'confianca-abaixo-do-limiar',
      }),
    ]);

    expect(incoerencia.leituras).toEqual([
      {
        campo: 'serie-chumbada-1',
        fonteFisica: 'chumbado-1',
        valorLido: SERIE,
        confianca: 0.988,
        veredito: 'conforme',
      },
      {
        campo: 'serie-chumbada-2',
        fonteFisica: 'chumbado-1',
        valorLido: SERIE_DA_PLACA_DEFEITUOSA,
        confianca: 0.846,
        veredito: 'nao_conferivel',
      },
    ]);
  });

  it('should NAO contar posicao sem leitura como discordancia', () => {
    // Ausencia nao e discordancia: "nao fotografei essa posicao" nunca pode
    // virar alarme de peca errada.
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE),
      campo('serie-chumbada-2', SERIE),
      campo('serie-chumbada-3', null, {
        veredito: 'nao_conferivel',
        motivo: 'sem-leitura',
      }),
    ]);

    expect(incoerencias).toEqual([]);
  });

  it('should NAO contar leitura so de espacos como discordancia', () => {
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE),
      campo('serie-chumbada-2', '   ', {
        veredito: 'nao_conferivel',
        motivo: 'sem-leitura',
      }),
    ]);

    expect(incoerencias).toEqual([]);
  });

  it('should nao gerar nada para grupo de um campo so (nao ha irmas)', () => {
    const incoerencias = detectarIncoerencias([
      campo('cliente-serigrafia', 'energisa', {
        valorEsperado: 'Energisa',
        fonteFisica: 'serigrafia',
      }),
    ]);

    expect(incoerencias).toEqual([]);
  });

  it('should ignorar campo sem valor esperado (sem esperado, sem irmas)', () => {
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE),
      campo('potencia-serigrafia', '10 kVA', {
        valorEsperado: null,
        obrigatorio: false,
        veredito: 'nao_conferivel',
        motivo: 'sem-valor-esperado',
      }),
    ]);

    expect(incoerencias).toEqual([]);
  });

  it('should separar grupos por valor esperado: serie discorda, patrimonio nao', () => {
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE),
      campo('serie-placa', SERIE_DA_PLACA_DEFEITUOSA, {
        veredito: 'divergente',
        fonteFisica: 'placa',
      }),
      campo('patrimonio-placa', PATRIMONIO, {
        valorEsperado: PATRIMONIO,
        fonteFisica: 'placa',
      }),
      campo('patrimonio-serigrafia', PATRIMONIO, {
        valorEsperado: PATRIMONIO,
        fonteFisica: 'serigrafia',
      }),
    ]);

    expect(incoerencias).toHaveLength(1);
    expect(incoerencias[0].campos).toEqual(['serie-chumbada-1', 'serie-placa']);
  });

  it('should acusar tambem o grupo do patrimonio (a regra nao conhece "serie")', () => {
    const incoerencias = detectarIncoerencias([
      campo('patrimonio-placa', PATRIMONIO, {
        valorEsperado: PATRIMONIO,
        fonteFisica: 'placa',
      }),
      campo('patrimonio-serigrafia', '251320', {
        valorEsperado: PATRIMONIO,
        fonteFisica: 'serigrafia',
        veredito: 'divergente',
      }),
    ]);

    expect(incoerencias).toHaveLength(1);
    expect(incoerencias[0].valoresLidos).toEqual([PATRIMONIO, '251320']);
  });

  it('should agrupar pelo esperado NORMALIZADO (espaco e caixa nao criam grupo novo)', () => {
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE, { valorEsperado: ` ${SERIE} ` }),
      campo('serie-chumbada-2', SERIE_DA_PLACA_DEFEITUOSA, {
        veredito: 'divergente',
      }),
    ]);

    expect(incoerencias).toHaveLength(1);
  });

  it('should tratar leituras que so diferem por caixa/espaco como concordantes', () => {
    const incoerencias = detectarIncoerencias([
      campo('cliente-serigrafia', 'Energisa', {
        valorEsperado: 'Energisa',
        fonteFisica: 'serigrafia',
      }),
      campo('cliente-placa', ' energisa ', {
        valorEsperado: 'Energisa',
        fonteFisica: 'placa',
      }),
    ]);

    expect(incoerencias).toEqual([]);
  });
});

describe('detectarIncoerencias — precedencia com as guardas existentes', () => {
  it('should ignorar leitura marcada como conflitante pelo dedupe', () => {
    // `conflitante` significa que DUAS leituras validas do mesmo campo ja
    // discordaram; a sobrevivente e a de maior confianca. Usa-la aqui faria a
    // incoerencia depender do desempate. O campo ja e nao_conferivel.
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE),
      campo('serie-chumbada-2', SERIE),
      campo('serie-placa', SERIE_DA_PLACA_DEFEITUOSA, {
        fonteFisica: 'placa',
        veredito: 'nao_conferivel',
        motivo: 'leituras-conflitantes',
      }),
    ]);

    expect(incoerencias).toEqual([]);
  });

  it('should ignorar leitura marcada como troca de campo', () => {
    // A marcacao do vizinho lida no lugar errado nao e afirmacao sobre esta
    // posicao: compara-la geraria discordancia fantasma em peca correta.
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE),
      campo('serie-chumbada-2', PATRIMONIO, {
        veredito: 'nao_conferivel',
        motivo: 'leitura-de-outro-campo',
      }),
    ]);

    expect(incoerencias).toEqual([]);
  });

  it('should manter a incoerencia entre as irmas SOBRANTES quando uma e excluida', () => {
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE),
      campo('serie-chumbada-2', SERIE_DA_PLACA_DEFEITUOSA, {
        veredito: 'divergente',
      }),
      campo('serie-chumbada-3', PATRIMONIO, {
        veredito: 'nao_conferivel',
        motivo: 'leitura-de-outro-campo',
      }),
    ]);

    expect(incoerencias).toHaveLength(1);
    expect(incoerencias[0].campos).toEqual([
      'serie-chumbada-1',
      'serie-chumbada-2',
    ]);
  });

  it('should INCLUIR a leitura de confianca baixa (o caso que motivou a regra)', () => {
    // Diferente de conflitante/trocado, confianca baixa ainda e uma afirmacao
    // sobre ESTA posicao. Excluir aqui apagaria exatamente o sinal medido.
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE),
      campo('serie-chumbada-2', SERIE_DA_PLACA_DEFEITUOSA, {
        confianca: 0.35,
        veredito: 'nao_conferivel',
        motivo: 'confianca-abaixo-do-limiar',
      }),
    ]);

    expect(incoerencias).toHaveLength(1);
  });
});

describe('detectarIncoerencias — checklist e dado, nao codigo', () => {
  function chumbados(quantidade: number, valorDoUltimo: string) {
    return Array.from({ length: quantidade }, (_, indice) =>
      campo(
        `serie-chumbada-${indice + 1}`,
        indice === quantidade - 1 ? valorDoUltimo : SERIE,
        {
          fonteFisica: `chumbado-${indice + 1}`,
          veredito:
            indice === quantidade - 1 && valorDoUltimo !== SERIE
              ? 'divergente'
              : 'conforme',
        },
      ),
    );
  }

  it('should funcionar com modelo de 2 chumbados', () => {
    expect(detectarIncoerencias(chumbados(2, SERIE))).toEqual([]);
    expect(
      detectarIncoerencias(chumbados(2, SERIE_DA_PLACA_DEFEITUOSA)),
    ).toHaveLength(1);
  });

  it('should funcionar com modelo de 4 chumbados, sem mudanca de codigo', () => {
    expect(detectarIncoerencias(chumbados(4, SERIE))).toEqual([]);

    const [incoerencia] = detectarIncoerencias(
      chumbados(4, SERIE_DA_PLACA_DEFEITUOSA),
    );
    expect(incoerencia.campos).toHaveLength(4);
    expect(incoerencia.valoresLidos).toEqual([
      SERIE,
      SERIE_DA_PLACA_DEFEITUOSA,
    ]);
  });

  it('should funcionar com campos nomeados fora da convencao TRAEL', () => {
    // Outro cliente, outros nomes: o grupo sai do valor esperado, nao do nome.
    const incoerencias = detectarIncoerencias([
      campo('nr-serie-tanque', SERIE, { fonteFisica: 'chumbado-1' }),
      campo('nr-serie-flange', SERIE_DA_PLACA_DEFEITUOSA, {
        fonteFisica: 'chumbado-2',
        veredito: 'divergente',
      }),
    ]);

    expect(incoerencias).toHaveLength(1);
  });

  it('should agrupar serie com patrimonio quando o QR traz o MESMO numero', () => {
    // Colisao benigna: se os dois esperados sao o mesmo numero, todas as
    // marcacoes realmente deveriam mostrar esse numero.
    const incoerencias = detectarIncoerencias([
      campo('serie-chumbada-1', SERIE),
      campo('patrimonio-placa', SERIE_DA_PLACA_DEFEITUOSA, {
        valorEsperado: SERIE,
        fonteFisica: 'placa',
        veredito: 'divergente',
      }),
    ]);

    expect(incoerencias).toHaveLength(1);
    expect(incoerencias[0].campos).toEqual([
      'serie-chumbada-1',
      'patrimonio-placa',
    ]);
  });
});

describe('conferir — incoerencia no veredito geral', () => {
  function item(
    nome: string,
    fonteFisica: string,
    obrigatorio = true,
  ): ItemChecklist {
    return { campo: nome, fonteFisica, obrigatorio };
  }

  function leitura(
    nome: string,
    valorLido: string | null,
    confianca: number | null = 0.99,
  ): LeituraCampo {
    return { campo: nome, valorLido, confianca };
  }

  const CHECKLIST_CHUMBADOS = [
    item('serie-chumbada-1', 'chumbado-1'),
    item('serie-chumbada-2', 'chumbado-2'),
    item('serie-chumbada-3', 'chumbado-3'),
  ];
  const ESPERADOS_CHUMBADOS = {
    'serie-chumbada-1': SERIE,
    'serie-chumbada-2': SERIE,
    'serie-chumbada-3': SERIE,
  };

  it('should devolver incoerencias vazio quando as tres posicoes concordam', () => {
    const resultado = conferir(
      CHECKLIST_CHUMBADOS,
      ESPERADOS_CHUMBADOS,
      [
        leitura('serie-chumbada-1', SERIE),
        leitura('serie-chumbada-2', SERIE),
        leitura('serie-chumbada-3', SERIE),
      ],
      { limiarConfianca: LIMIAR },
    );

    expect(resultado.incoerencias).toEqual([]);
    expect(resultado.vereditoGeral).toBe('conforme');
  });

  it('should acusar a incoerencia do caso medido sem mexer no veredito do campo', () => {
    const resultado = conferir(
      CHECKLIST_CHUMBADOS,
      ESPERADOS_CHUMBADOS,
      [
        leitura('serie-chumbada-1', SERIE, 0.988),
        leitura('serie-chumbada-2', SERIE, 0.988),
        leitura('serie-chumbada-3', SERIE_DA_PLACA_DEFEITUOSA, 0.846),
      ],
      { limiarConfianca: LIMIAR },
    );

    // A posicao fraca continua nao_conferivel pelo limiar (nao vira conforme
    // por maioria, nem divergente por leitura sem lastro).
    expect(resultado.campos[2]).toMatchObject({
      veredito: 'nao_conferivel',
      motivo: 'confianca-abaixo-do-limiar',
    });
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
    expect(resultado.incoerencias).toHaveLength(1);
    expect(resultado.incoerencias[0].valoresLidos).toEqual([
      SERIE,
      SERIE_DA_PLACA_DEFEITUOSA,
    ]);
  });

  it('should NUNCA aprovar por maioria: duas contra uma nao viram conforme', () => {
    const resultado = conferir(
      CHECKLIST_CHUMBADOS,
      ESPERADOS_CHUMBADOS,
      [
        leitura('serie-chumbada-1', SERIE),
        leitura('serie-chumbada-2', SERIE),
        leitura('serie-chumbada-3', SERIE_DA_PLACA_DEFEITUOSA),
      ],
      { limiarConfianca: LIMIAR },
    );

    // Posicao gravada errada de verdade (leitura com lastro): e divergencia, e
    // continua sendo. Maioria nao apaga defeito real.
    expect(resultado.campos[2].veredito).toBe('divergente');
    expect(resultado.vereditoGeral).toBe('divergente');
    expect(resultado.incoerencias).toHaveLength(1);
  });

  it('should rebaixar conforme -> nao_conferivel quando quem discorda e campo OPCIONAL', () => {
    // Unico caso em que a incoerencia MUDA o veredito geral: o obrigatorio ja
    // bloqueia sozinho. Opcional que leu OUTRO NUMERO nao e "opcional
    // ilegivel" — e peca sobre a qual nao se pode afirmar conforme.
    const checklist = [
      item('serie-chumbada-1', 'chumbado-1'),
      item('serie-chumbada-2', 'chumbado-2', false),
    ];
    const resultado = conferir(
      checklist,
      { 'serie-chumbada-1': SERIE, 'serie-chumbada-2': SERIE },
      [
        leitura('serie-chumbada-1', SERIE),
        leitura('serie-chumbada-2', SERIE_DA_PLACA_DEFEITUOSA, 0.5),
      ],
      { limiarConfianca: LIMIAR },
    );

    expect(resultado.campos[0].veredito).toBe('conforme');
    expect(resultado.campos[1].veredito).toBe('nao_conferivel');
    expect(resultado.incoerencias).toHaveLength(1);
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should manter conforme quando o opcional apenas nao foi lido', () => {
    // Contraprova do teste anterior: ausencia nao gera incoerencia e o
    // criterio 4 do SPEC (opcional ilegivel nao bloqueia) segue valendo.
    const checklist = [
      item('serie-chumbada-1', 'chumbado-1'),
      item('serie-chumbada-2', 'chumbado-2', false),
    ];
    const resultado = conferir(
      checklist,
      { 'serie-chumbada-1': SERIE, 'serie-chumbada-2': SERIE },
      [leitura('serie-chumbada-1', SERIE), leitura('serie-chumbada-2', null)],
      { limiarConfianca: LIMIAR },
    );

    expect(resultado.incoerencias).toEqual([]);
    expect(resultado.vereditoGeral).toBe('conforme');
  });
});

describe('conferir — cenario-ancora com a peca de demonstracao', () => {
  // Peca real: etiqueta e chumbados 847233, placa gravada 847833. A placa
  // DIVERGE de verdade e as irmas concordam entre si — a incoerencia tem de
  // APONTAR a placa, nunca suavizar o divergente para "ruido de OCR".
  const checklist: ItemChecklist[] = [
    { campo: 'serie-chumbada-1', fonteFisica: 'chumbado-1', obrigatorio: true },
    { campo: 'serie-chumbada-2', fonteFisica: 'chumbado-2', obrigatorio: true },
    { campo: 'serie-chumbada-3', fonteFisica: 'chumbado-3', obrigatorio: true },
    { campo: 'serie-placa', fonteFisica: 'placa', obrigatorio: true },
    { campo: 'patrimonio-placa', fonteFisica: 'placa', obrigatorio: true },
    {
      campo: 'patrimonio-serigrafia',
      fonteFisica: 'serigrafia',
      obrigatorio: true,
    },
  ];
  const esperados = {
    'serie-chumbada-1': SERIE,
    'serie-chumbada-2': SERIE,
    'serie-chumbada-3': SERIE,
    'serie-placa': SERIE,
    'patrimonio-placa': PATRIMONIO,
    'patrimonio-serigrafia': PATRIMONIO,
  };
  const resultado = conferir(
    checklist,
    esperados,
    [
      { campo: 'serie-chumbada-1', valorLido: SERIE, confianca: 0.999 },
      { campo: 'serie-chumbada-2', valorLido: SERIE, confianca: 0.998 },
      { campo: 'serie-chumbada-3', valorLido: SERIE, confianca: 0.967 },
      {
        campo: 'serie-placa',
        valorLido: SERIE_DA_PLACA_DEFEITUOSA,
        confianca: 0.998,
      },
      { campo: 'patrimonio-placa', valorLido: PATRIMONIO, confianca: 0.99 },
      {
        campo: 'patrimonio-serigrafia',
        valorLido: PATRIMONIO,
        confianca: 0.97,
      },
    ],
    { limiarConfianca: LIMIAR },
  );

  it('should manter o veredito geral divergente (criterio 2 do SPEC)', () => {
    expect(resultado.vereditoGeral).toBe('divergente');
  });

  it('should manter serie-placa como o unico campo divergente', () => {
    const divergentes = resultado.campos
      .filter((atual) => atual.veredito === 'divergente')
      .map((atual) => atual.campo);

    expect(divergentes).toEqual(['serie-placa']);
  });

  it('should apontar a placa contra as tres chumbadas na incoerencia', () => {
    expect(resultado.incoerencias).toHaveLength(1);
    expect(resultado.incoerencias[0]).toMatchObject({
      valorEsperado: SERIE,
      campos: [
        'serie-chumbada-1',
        'serie-chumbada-2',
        'serie-chumbada-3',
        'serie-placa',
      ],
      valoresLidos: [SERIE, SERIE_DA_PLACA_DEFEITUOSA],
    });
  });

  it('should nao acusar incoerencia no grupo do patrimonio', () => {
    const doPatrimonio = resultado.incoerencias.filter((incoerencia) =>
      incoerencia.campos.some((nome) => nome.startsWith('patrimonio-')),
    );

    expect(doPatrimonio).toEqual([]);
  });
});
