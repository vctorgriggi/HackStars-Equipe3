import { conferir } from './engine-conformidade';
import { ItemChecklist, LeituraCampo } from './tipos';

// REGRA "ANTES DE ACUSAR, CONFIRME" (aprovada em 2026-07-25, depois do spike
// dos recortes). Marcacao em RELEVO nao vira `divergente` a partir de uma
// leitura sozinha: exige recortes concordantes E nenhuma posicao irma tendo
// lido outro numero.
//
// O TESTE MAIS IMPORTANTE DESTA SUITE e o do cenario-ancora: a serie da PLACA
// e texto impresso (le a 99,9%) e TEM de continuar `divergente` — criterio 2 do
// SPEC.

const LIMIAR = 0.9;

const SERIE = '847233';
const SERIE_ERRADA = '847833';
const OUTRA_SERIE = '847999';

const ESPERADOS: Record<string, string> = {
  'serie-chumbada-topo': SERIE,
  'serie-chumbada-lateral-direita': SERIE,
  'serie-chumbada-traseira': SERIE,
  'serie-placa': SERIE,
};

function item(campo: string, fonteFisica: string): ItemChecklist {
  return { campo, fonteFisica, obrigatorio: true };
}

function leitura(
  campo: string,
  valorLido: string | null,
  corroboracao?: 'confirmada' | 'nao-confirmada',
  confianca: number | null = 0.98,
): LeituraCampo {
  return {
    campo,
    valorLido,
    confianca,
    ...(corroboracao === undefined ? {} : { corroboracao }),
  };
}

const SO_A_TRASEIRA = [item('serie-chumbada-traseira', 'traseira')];

describe('relevo sem corroboracao nao acusa', () => {
  it('should virar nao_conferivel com motivo leitura-nao-corroborada', () => {
    const resultado = conferir(
      SO_A_TRASEIRA,
      ESPERADOS,
      [leitura('serie-chumbada-traseira', SERIE_ERRADA, 'nao-confirmada')],
      { limiarConfianca: LIMIAR },
    );

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('leitura-nao-corroborada');
  });

  it('should rebaixar tambem o veredito GERAL, que nunca vira conforme', () => {
    // A peca continua sem passar: muda a mensagem, nao a liberacao.
    const resultado = conferir(
      SO_A_TRASEIRA,
      ESPERADOS,
      [leitura('serie-chumbada-traseira', SERIE_ERRADA, 'nao-confirmada')],
      { limiarConfianca: LIMIAR },
    );

    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should manter conforme a leitura nao corroborada que BATE com o QR', () => {
    // A regra restringe ACUSACAO, nao aprovacao — senao uma falha de recorte
    // derrubaria o criterio 3 do SPEC (conjunto conforme).
    const resultado = conferir(
      SO_A_TRASEIRA,
      ESPERADOS,
      [leitura('serie-chumbada-traseira', SERIE, 'nao-confirmada')],
      { limiarConfianca: LIMIAR },
    );

    expect(resultado.campos[0].veredito).toBe('conforme');
    expect(resultado.vereditoGeral).toBe('conforme');
  });

  it('should distinguir leitura anulada por recortes discordantes de campo nao fotografado', () => {
    // Adapter anula o valor quando os recortes se contradizem; o motivo separa
    // "li e me contradisse" de "ninguem fotografou esta posicao".
    const anulada = conferir(
      SO_A_TRASEIRA,
      ESPERADOS,
      [leitura('serie-chumbada-traseira', null, 'nao-confirmada', null)],
      { limiarConfianca: LIMIAR },
    );
    const ausente = conferir(
      SO_A_TRASEIRA,
      ESPERADOS,
      [leitura('serie-chumbada-traseira', null, undefined, null)],
      { limiarConfianca: LIMIAR },
    );

    expect(anulada.campos[0].motivo).toBe('leitura-nao-corroborada');
    expect(ausente.campos[0].motivo).toBe('sem-leitura');
  });
});

describe('relevo corroborado acusa', () => {
  it('should manter divergente quando os recortes concordam e nao ha irma', () => {
    const resultado = conferir(
      SO_A_TRASEIRA,
      ESPERADOS,
      [leitura('serie-chumbada-traseira', SERIE_ERRADA, 'confirmada')],
      { limiarConfianca: LIMIAR },
    );

    expect(resultado.campos[0].veredito).toBe('divergente');
    expect(resultado.vereditoGeral).toBe('divergente');
  });

  it('should manter divergente quando as tres posicoes leem o MESMO numero errado', () => {
    // Peca gravada errada de verdade: as irmas concordam entre si, entao nao ha
    // incoerencia e a acusacao esta lastreada por 3 posicoes.
    const checklist = [
      item('serie-chumbada-topo', 'topo'),
      item('serie-chumbada-lateral-direita', 'lateral-direita'),
      item('serie-chumbada-traseira', 'traseira'),
    ];
    const resultado = conferir(
      checklist,
      ESPERADOS,
      [
        leitura('serie-chumbada-topo', OUTRA_SERIE, 'confirmada'),
        leitura('serie-chumbada-lateral-direita', OUTRA_SERIE, 'confirmada'),
        leitura('serie-chumbada-traseira', OUTRA_SERIE, 'confirmada'),
      ],
      { limiarConfianca: LIMIAR },
    );

    expect(
      resultado.campos.every((campo) => campo.veredito === 'divergente'),
    ).toBe(true);
    expect(resultado.vereditoGeral).toBe('divergente');
  });

  it('should NAO acusar as chumbadas quando a PLACA irma discorda delas', () => {
    // Consequencia conhecida e aceita: "irma" e o campo de mesmo valor esperado,
    // e a placa entra no grupo. Peca gravada errada nas 3 posicoes, com a placa
    // certa, sai `nao_conferivel` nas tres — barrada do mesmo jeito, com a
    // mensagem "confira as posicoes" em vez de "peca defeituosa". O caminho de
    // volta para `divergente` e a checklist declarar tipo de marcacao.
    const checklist = [
      item('serie-chumbada-topo', 'topo'),
      item('serie-chumbada-lateral-direita', 'lateral-direita'),
      item('serie-chumbada-traseira', 'traseira'),
      item('serie-placa', 'placa'),
    ];
    const resultado = conferir(
      checklist,
      ESPERADOS,
      [
        leitura('serie-chumbada-topo', OUTRA_SERIE, 'confirmada'),
        leitura('serie-chumbada-lateral-direita', OUTRA_SERIE, 'confirmada'),
        leitura('serie-chumbada-traseira', OUTRA_SERIE, 'confirmada'),
        leitura('serie-placa', SERIE, undefined, 0.999),
      ],
      { limiarConfianca: LIMIAR },
    );

    expect(
      resultado.campos
        .filter((campo) => campo.campo.includes('chumbada'))
        .every((campo) => campo.motivo === 'leitura-nao-corroborada'),
    ).toBe(true);
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should NAO acusar quando uma posicao irma leu outro numero', () => {
    // Item (iii): as irmas discordam entre si, entao nao da para dizer qual
    // posicao esta errada. "Nao posso afirmar, confira a foto" — nunca "peca
    // defeituosa".
    const checklist = [
      item('serie-chumbada-topo', 'topo'),
      item('serie-chumbada-traseira', 'traseira'),
    ];
    const resultado = conferir(
      checklist,
      ESPERADOS,
      [
        leitura('serie-chumbada-topo', SERIE, 'confirmada'),
        leitura('serie-chumbada-traseira', OUTRA_SERIE, 'confirmada'),
      ],
      { limiarConfianca: LIMIAR },
    );

    const traseira = resultado.campos[1];
    expect(traseira.veredito).toBe('nao_conferivel');
    expect(traseira.motivo).toBe('leitura-nao-corroborada');
    // O que a discordancia produziu continua visivel para o humano.
    expect(resultado.incoerencias).toHaveLength(1);
    expect(resultado.vereditoGeral).toBe('nao_conferivel');
  });

  it('should reportar na incoerencia o veredito JA rebaixado', () => {
    // A coerencia e recalculada depois do rebaixamento: a resposta nao pode
    // mostrar `divergente` num campo que saiu `nao_conferivel`.
    const checklist = [
      item('serie-chumbada-topo', 'topo'),
      item('serie-chumbada-traseira', 'traseira'),
    ];
    const resultado = conferir(
      checklist,
      ESPERADOS,
      [
        leitura('serie-chumbada-topo', SERIE, 'confirmada'),
        leitura('serie-chumbada-traseira', OUTRA_SERIE, 'confirmada'),
      ],
      { limiarConfianca: LIMIAR },
    );

    const doGrupo = resultado.incoerencias[0].leituras.find(
      (atual) => atual.campo === 'serie-chumbada-traseira',
    );
    expect(doGrupo?.veredito).toBe('nao_conferivel');
  });
});

describe('cenario-ancora — a placa impressa continua sendo acusada', () => {
  const checklist = [
    item('serie-chumbada-topo', 'topo'),
    item('serie-chumbada-lateral-direita', 'lateral-direita'),
    item('serie-chumbada-traseira', 'traseira'),
    item('serie-placa', 'placa'),
  ];

  // Peca de demonstracao: chumbados e etiqueta dizem 847233, a placa foi
  // gravada 847833. Criterio 2 do SPEC: o UNICO campo divergente e a da placa.
  const leituras = [
    leitura('serie-chumbada-topo', SERIE, 'confirmada'),
    leitura('serie-chumbada-lateral-direita', SERIE, 'confirmada'),
    leitura('serie-chumbada-traseira', SERIE, 'confirmada'),
    // Sem `corroboracao`: texto impresso nao exige segunda evidencia.
    leitura('serie-placa', SERIE_ERRADA, undefined, 0.999),
  ];

  it('should acusar so a serie da placa, com veredito geral divergente', () => {
    const resultado = conferir(checklist, ESPERADOS, leituras, {
      limiarConfianca: LIMIAR,
    });

    const divergentes = resultado.campos.filter(
      (campo) => campo.veredito === 'divergente',
    );
    expect(divergentes.map((campo) => campo.campo)).toEqual(['serie-placa']);
    expect(resultado.vereditoGeral).toBe('divergente');
  });

  it('should acusar a placa mesmo com as chumbadas discordando dela', () => {
    // A placa participa do grupo de irmaos (mesmo valor esperado) e discorda de
    // todas as chumbadas — a incoerencia existe. Ainda assim ela e acusada: a
    // regra so protege marcacao em RELEVO.
    const resultado = conferir(checklist, ESPERADOS, leituras, {
      limiarConfianca: LIMIAR,
    });

    expect(resultado.incoerencias).toHaveLength(1);
    expect(
      resultado.campos.find((campo) => campo.campo === 'serie-placa')?.motivo,
    ).toBeUndefined();
  });

  it('should seguir acusando a placa mesmo sem corroborar as chumbadas', () => {
    // Deploy sem lib de imagem (ou EXTRACAO_RECORTE=off): as chumbadas chegam
    // `nao-confirmada` e a placa continua contando a historia da demo.
    const semCorroboracao = leituras.map((atual) =>
      atual.campo === 'serie-placa'
        ? atual
        : { ...atual, corroboracao: 'nao-confirmada' as const },
    );
    const resultado = conferir(checklist, ESPERADOS, semCorroboracao, {
      limiarConfianca: LIMIAR,
    });

    expect(
      resultado.campos.filter((campo) => campo.veredito === 'divergente'),
    ).toHaveLength(1);
    expect(resultado.vereditoGeral).toBe('divergente');
  });
});
