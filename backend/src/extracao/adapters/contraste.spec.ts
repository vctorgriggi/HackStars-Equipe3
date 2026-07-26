import {
  EstatisticasDeRegiao,
  ResumoLuminancia,
  casarPorContraste,
  claridadeRelativa,
  classificarMarcacao,
  escuridaoRelativa,
  histogramaDe,
  medicaoConclusiva,
  resumirHistograma,
} from './contraste';

// DISCRIMINACAO TINTA x RELEVO — testes da parte PURA, com estatisticas
// sinteticas. Nenhum pixel, nenhuma lib nativa, nenhuma AWS: e a mesma
// disciplina de `interpretarBlocos` e da engine de conformidade.
//
// Os numeros usados aqui vem da calibracao com as fotos reais (tabela em
// `contraste.ts`), entao cada caso abaixo tem endereco na peca:
//   relevo  -> serie chumbada (TOPO-2, LATERAL-DIREITA-2, DIAGONAL-...-2)
//   tinta   -> patrimonio serigrafado (TOPO-2, FRENTE-2) e etiqueta
//   claro   -> placa preta com texto claro (PLACA-4)

function regiao(
  dentro: Partial<ResumoLuminancia>,
  anel: Partial<ResumoLuminancia>,
): EstatisticasDeRegiao {
  const base: ResumoLuminancia = {
    pixels: 5000,
    media: 128,
    desvio: 30,
    p10: 100,
    p50: 128,
    p90: 150,
  };

  return { dentro: { ...base, ...dentro }, anel: { ...base, ...anel } };
}

describe('resumirHistograma', () => {
  it('should calcular media, desvio e percentis de uma amostra conhecida', () => {
    // 100 pixels em 0 e 100 em 200: media 100, desvio 100.
    const baldes = new Uint32Array(256);
    baldes[0] = 100;
    baldes[200] = 100;

    const resumo = resumirHistograma(baldes);

    expect(resumo.pixels).toBe(200);
    expect(resumo.media).toBeCloseTo(100);
    expect(resumo.desvio).toBeCloseTo(100);
    expect(resumo.p10).toBe(0);
    expect(resumo.p90).toBe(200);
  });

  it('should devolver zeros para histograma vazio, sem NaN', () => {
    // Anel degenerado (caixa colada na borda da foto) chega aqui. NaN passaria
    // silencioso por toda comparacao de limiar.
    const resumo = resumirHistograma(new Uint32Array(256));

    expect(resumo).toEqual({
      pixels: 0,
      media: 0,
      desvio: 0,
      p10: 0,
      p50: 0,
      p90: 0,
    });
  });

  it('should nunca devolver desvio NaN em regiao perfeitamente uniforme', () => {
    // Variancia por soma de quadrados pode dar -1e-13 em ponto flutuante.
    const resumo = resumirHistograma(
      histogramaDe(new Uint8Array(1000).fill(37)),
    );

    expect(resumo.desvio).toBe(0);
    expect(resumo.media).toBeCloseTo(37);
    expect(resumo.p50).toBe(37);
  });
});

describe('escuridaoRelativa e claridadeRelativa', () => {
  it('should medir a marcacao contra o fundo IMEDIATO, nao contra o absoluto', () => {
    // Mesma marcacao, duas iluminacoes: a sombra derruba os dois lados juntos e
    // a razao nao muda. E o motivo de existir o anel.
    const noSol = regiao({ p10: 49, p90: 208 }, { p50: 199 });
    const naSombra = regiao({ p10: 8, p90: 147 }, { p50: 158 });

    expect(escuridaoRelativa(noSol)).toBeCloseTo(0.588, 2);
    expect(escuridaoRelativa(naSombra)).toBeCloseTo(0.588, 2);
  });

  it('should devolver claridade alta para texto claro sobre fundo escuro', () => {
    expect(claridadeRelativa(regiao({ p90: 147 }, { p50: 16 }))).toBeCloseTo(
      0.514,
      2,
    );
  });
});

describe('classificarMarcacao', () => {
  it('should classificar como tinta o patrimonio serigrafado do topo', () => {
    // TOPO-2: escuridao 0,588 · claridade 0,035 · desvio 55,8.
    expect(
      classificarMarcacao(
        regiao({ p10: 49, p90: 208, desvio: 55.8 }, { p50: 199 }),
      ),
    ).toBe('tinta');
  });

  it('should classificar como tinta a mesma marcacao fotografada na sombra', () => {
    // A luz muda os valores absolutos; a classe nao pode mudar com ela.
    expect(
      classificarMarcacao(
        regiao({ p10: 8, p90: 56, desvio: 53.6 }, { p50: 160 }),
      ),
    ).toBe('tinta');
  });

  it('should classificar como relevo a serie chumbada', () => {
    // TOPO-2: escuridao 0,118 · claridade 0,122 · desvio 23,1. E o caso mais
    // "forte" dos tres chumbados medidos, e mesmo ele fica longe do limiar.
    expect(
      classificarMarcacao(
        regiao({ p10: 170, p90: 231, desvio: 23.1 }, { p50: 200 }),
      ),
    ).toBe('relevo');
  });

  it('should classificar como relevo o chumbado de contraste quase nulo', () => {
    // LATERAL-DIREITA-2: escuridao 0,031 · claridade 0,075 · desvio 12,6.
    expect(
      classificarMarcacao(
        regiao({ p10: 138, p90: 165, desvio: 12.6 }, { p50: 146 }),
      ),
    ).toBe('relevo');
  });

  it('should classificar a placa preta como claro-sobre-escuro, nunca como tinta', () => {
    // PLACA-4 e o terceiro caso. Se ele virasse `tinta`, o numero de serie da
    // placa que aparece de relance numa foto de vista poderia ser entregue como
    // patrimonio serigrafado — troca de campo com evidencia falsa.
    expect(
      classificarMarcacao(
        regiao({ p10: 8, p90: 147, desvio: 53.8 }, { p50: 16 }),
      ),
    ).toBe('claro-sobre-escuro');
  });

  it('should devolver indeterminado para regiao chapada, mesmo com contraste nulo', () => {
    // A GUARDA MAIS IMPORTANTE: sem ela, um bounding box caindo no lugar errado
    // (regiao vazia, desvio ~1) viraria "relevo" com toda a certeza do mundo —
    // foi exatamente a assinatura do bug de coordenada EXIF (`recorte.ts`).
    expect(
      classificarMarcacao(
        regiao({ p10: 178, p50: 179, p90: 181, desvio: 1.3 }, { p50: 179 }),
      ),
    ).toBe('indeterminado');
  });

  it('should devolver indeterminado na faixa morta entre relevo e tinta', () => {
    // escuridao 0,25: acima do teto de relevo (0,20) e abaixo do limiar de
    // tinta (0,30). Duvida declarada nao resolve campo nenhum.
    expect(
      classificarMarcacao(
        regiao({ p10: 136, p90: 210, desvio: 40 }, { p50: 200 }),
      ),
    ).toBe('indeterminado');
  });

  it('should devolver indeterminado quando a regiao e escura E clara ao mesmo tempo', () => {
    // Bounding box cobrindo tinta preta e fundo de placa: evidencia
    // contraditoria nao decide.
    expect(
      classificarMarcacao(
        regiao({ p10: 10, p90: 250, desvio: 90 }, { p50: 128 }),
      ),
    ).toBe('indeterminado');
  });

  it('should devolver indeterminado quando a amostra e pequena demais', () => {
    expect(
      classificarMarcacao(
        regiao({ pixels: 40, p10: 49, p90: 208, desvio: 55.8 }, { p50: 199 }),
      ),
    ).toBe('indeterminado');
  });

  it('should devolver indeterminado quando o anel nao tem pixels suficientes', () => {
    // Caixa colada na borda da foto: sem fundo de referencia nao ha medida.
    expect(
      classificarMarcacao(
        regiao({ p10: 49, p90: 208, desvio: 55.8 }, { pixels: 3, p50: 199 }),
      ),
    ).toBe('indeterminado');
  });
});

describe('casarPorContraste', () => {
  const ALVOS_DO_TOPO = [
    { campo: 'serie-chumbada-topo', tipo: 'relevo' as const },
    { campo: 'patrimonio-serigrafia-topo', tipo: 'tinta' as const },
  ];

  it('should casar cada numero com o alvo do tipo correspondente', () => {
    expect(
      casarPorContraste(ALVOS_DO_TOPO, [
        { chave: 'a', classe: 'relevo' },
        { chave: 'b', classe: 'tinta' },
      ]),
    ).toEqual([
      { campo: 'serie-chumbada-topo', chave: 'a' },
      { campo: 'patrimonio-serigrafia-topo', chave: 'b' },
    ]);
  });

  it('should resolver so o alvo que tem candidato, deixando o outro pendente', () => {
    // O caso do topo com UM numero legivel: ele e relevo, entao e a serie
    // chumbada. O patrimonio continua sem leitura — e isso e correto.
    expect(
      casarPorContraste(ALVOS_DO_TOPO, [{ chave: 'a', classe: 'relevo' }]),
    ).toEqual([{ campo: 'serie-chumbada-topo', chave: 'a' }]);
  });

  it('should recusar TUDO quando algum candidato ficou indeterminado', () => {
    // Um numero que nao deu para medir e um numero que pode ser de qualquer
    // alvo. Resolver os outros seria escolher entre hipoteses vivas.
    expect(
      casarPorContraste(ALVOS_DO_TOPO, [
        { chave: 'a', classe: 'relevo' },
        { chave: 'b', classe: 'indeterminado' },
      ]),
    ).toEqual([]);
  });

  it('should recusar quando dois candidatos caem na mesma classe', () => {
    expect(
      casarPorContraste(ALVOS_DO_TOPO, [
        { chave: 'a', classe: 'tinta' },
        { chave: 'b', classe: 'tinta' },
      ]),
    ).toEqual([]);
  });

  it('should recusar quando dois alvos pendentes esperam o mesmo tipo', () => {
    // Duas posicoes em relevo na mesma vista sao indistinguiveis por fisica.
    expect(
      casarPorContraste(
        [
          { campo: 'serie-chumbada-topo', tipo: 'relevo' },
          { campo: 'serie-chumbada-traseira', tipo: 'relevo' },
        ],
        [{ chave: 'a', classe: 'relevo' }],
      ),
    ).toEqual([]);
  });

  it('should nunca casar candidato claro-sobre-escuro com alvo nenhum', () => {
    // O 847833 da PLACA visto de relance numa foto de vista. Ele existe no
    // conjunto para NAO ser confundido com a serie chumbada do tanque.
    expect(
      casarPorContraste(
        [{ campo: 'serie-chumbada-lateral-direita', tipo: 'relevo' }],
        [{ chave: 'placa', classe: 'claro-sobre-escuro' }],
      ),
    ).toEqual([]);
  });

  it('should escolher o relevo entre etiqueta, placa e tanque na mesma foto', () => {
    // LATERAL-DIREITA-2 real: a foto pega a etiqueta (tinta), a placa
    // (claro-sobre-escuro) e a serie chumbada (relevo). So uma e do tanque.
    expect(
      casarPorContraste(
        [{ campo: 'serie-chumbada-lateral-direita', tipo: 'relevo' }],
        [
          { chave: 'etiqueta', classe: 'tinta' },
          { chave: 'tanque', classe: 'relevo' },
          { chave: 'placa', classe: 'claro-sobre-escuro' },
        ],
      ),
    ).toEqual([{ campo: 'serie-chumbada-lateral-direita', chave: 'tanque' }]);
  });

  it('should ignorar alvo de tipo indefinido (os campos da placa)', () => {
    expect(
      casarPorContraste(
        [
          { campo: 'serie-placa', tipo: 'indefinido' },
          { campo: 'patrimonio-placa', tipo: 'indefinido' },
        ],
        [{ chave: 'a', classe: 'claro-sobre-escuro' }],
      ),
    ).toEqual([]);
  });

  it('should devolver vazio sem candidato nenhum', () => {
    expect(casarPorContraste(ALVOS_DO_TOPO, [])).toEqual([]);
  });
});

describe('medicaoConclusiva', () => {
  // A FRONTEIRA ENTRE "NAO SEI" E "NAO E". Sem ela, uma foto sem textura (ou
  // sem lib de imagem) zeraria leituras que ja funcionavam — o oposto do que a
  // discriminacao por contraste existe para fazer. Foi o que quebrou a suite da
  // corroboracao por recorte antes desta guarda existir.

  it('should aceitar o conjunto quando toda classe e decisiva', () => {
    expect(medicaoConclusiva(['relevo', 'tinta'])).toBe(true);
    expect(medicaoConclusiva(['claro-sobre-escuro'])).toBe(true);
  });

  it('should recusar quando alguma classe ficou indeterminada', () => {
    expect(medicaoConclusiva(['relevo', 'indeterminado'])).toBe(false);
  });

  it('should recusar o conjunto vazio (ninguem mediu)', () => {
    expect(medicaoConclusiva([])).toBe(false);
  });
});
