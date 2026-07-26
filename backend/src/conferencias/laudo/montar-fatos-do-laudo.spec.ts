import { DISCLAIMER_LAUDO } from '../../extracao/ports/redator.port';
import { VereditoConferencia } from '../consultas/veredito-conferencia';
import {
  garantirDisclaimer,
  montarFatosDoLaudo,
} from './montar-fatos-do-laudo';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should".
//
// O QUE ESTA SUITE PROTEGE: a fronteira do que o modelo de linguagem tem
// permissao de saber. Tudo que passa por `montarFatosDoLaudo` vira prompt; o
// que nao passa, o prompt proibe supor. Por isso um campo a mais aqui e uma
// decisao, nao um detalhe — e por isso as contagens sao testadas: elas sao a
// unica afirmacao NUMERICA que o laudo pode fazer sem inventar.

const AGORA = new Date('2026-07-26T13:02:11.412Z');

function campo(
  overrides: Partial<VereditoConferencia['campos'][number]> = {},
): VereditoConferencia['campos'][number] {
  return {
    id: 'campo-1',
    campo: 'serie-placa',
    fonteFisica: 'placa',
    obrigatorio: true,
    valorEsperado: '847233',
    valorLido: '847233',
    confianca: 0.998,
    veredito: 'conforme',
    regiaoLeitura: null,
    fotoEvidencia: null,
    ...overrides,
  };
}

function veredito(
  overrides: Partial<VereditoConferencia> = {},
): VereditoConferencia {
  return {
    conferencia: {
      id: 'conferencia-1',
      vereditoGeral: 'divergente',
      createdAt: AGORA,
      observacao: null,
      checkpoint: {
        codigo: 'fixacao-placa',
        nome: 'Fixação da placa',
        ordem: 4,
      },
    },
    transformador: {
      id: 'transformador-1',
      numeroSerie: '847233',
      patrimonio: '251328',
      cliente: 'Energisa',
    },
    campos: [],
    ...overrides,
  };
}

describe('montarFatosDoLaudo', () => {
  it('should levar peca, etapa, veredito geral e campos para os fatos', () => {
    const fatos = montarFatosDoLaudo(
      veredito({
        campos: [
          campo({
            campo: 'serie-placa',
            valorLido: '847833',
            veredito: 'divergente',
          }),
        ],
      }),
    );

    expect(fatos.peca).toEqual({
      numeroSerie: '847233',
      patrimonio: '251328',
      cliente: 'Energisa',
    });
    // Nome legivel, nao o `codigo` de maquina: quem le o laudo e gente.
    expect(fatos.etapaAvaliada).toBe('Fixação da placa');
    expect(fatos.vereditoGeral).toBe('divergente');
    expect(fatos.conferidaEm).toBe('2026-07-26T13:02:11.412Z');
    expect(fatos.campos).toEqual([
      {
        campo: 'serie-placa',
        veredito: 'divergente',
        valorEsperado: '847233',
        valorLido: '847833',
        confianca: 0.998,
      },
    ]);
  });

  it('should NAO levar id, foto nem regiao de leitura para o prompt', () => {
    // Menos superficie, menos chance de o modelo referenciar algo que o leitor
    // nao tem como conferir.
    const fatos = montarFatosDoLaudo(
      veredito({
        campos: [
          campo({
            regiaoLeitura: '{"Left":0.31}',
            fotoEvidencia: { id: 'foto-1' } as never,
          }),
        ],
      }),
    );

    expect(Object.keys(fatos.campos[0]).sort()).toEqual([
      'campo',
      'confianca',
      'valorEsperado',
      'valorLido',
      'veredito',
    ]);
  });

  it('should contar cada veredito e fechar a soma com o total', () => {
    const fatos = montarFatosDoLaudo(
      veredito({
        campos: [
          campo({ id: 'a', veredito: 'conforme' }),
          campo({ id: 'b', veredito: 'conforme' }),
          campo({ id: 'c', veredito: 'divergente' }),
          campo({ id: 'd', veredito: 'nao_conferivel' }),
          campo({ id: 'e', veredito: 'nao_conferivel' }),
          campo({ id: 'f', veredito: 'nao_conferivel' }),
        ],
      }),
    );

    expect(fatos.contagens).toEqual({
      total: 6,
      conformes: 2,
      divergentes: 1,
      naoConferiveis: 3,
      semVeredito: 0,
    });
  });

  it('should contar campo sem veredito em vez de descartar', () => {
    // Descartar faria a soma dos baldes mentir sobre o que o banco tem.
    const fatos = montarFatosDoLaudo(
      veredito({
        campos: [
          campo({ id: 'a', veredito: 'conforme' }),
          campo({ id: 'b', veredito: null }),
          campo({ id: 'c', veredito: 'coisa-que-nao-existe' }),
        ],
      }),
    );

    expect(fatos.contagens.total).toBe(3);
    expect(fatos.contagens.semVeredito).toBe(2);
    const { total, ...baldes } = fatos.contagens;
    expect(Object.values(baldes).reduce((soma, item) => soma + item, 0)).toBe(
      total,
    );
  });

  it('should devolver etapaAvaliada null quando a conferencia cobriu a peca inteira', () => {
    const fatos = montarFatosDoLaudo(
      veredito({
        conferencia: {
          ...veredito().conferencia,
          checkpoint: null,
        },
      }),
    );

    expect(fatos.etapaAvaliada).toBeNull();
  });

  it('should levar a observacao registrada pelo time', () => {
    const fatos = montarFatosDoLaudo(
      veredito({
        conferencia: {
          ...veredito().conferencia,
          observacao: 'Excecao aceita pelo time — placa sera regravada.',
        },
      }),
    );

    expect(fatos.observacao).toBe(
      'Excecao aceita pelo time — placa sera regravada.',
    );
  });

  it('should aceitar conferencia sem campo nenhum sem quebrar', () => {
    const fatos = montarFatosDoLaudo(veredito({ campos: [] }));

    expect(fatos.campos).toEqual([]);
    expect(fatos.contagens.total).toBe(0);
  });
});

describe('garantirDisclaimer', () => {
  it('should carimbar o disclaimer quando o modelo esquece', () => {
    // A obrigacao "todo laudo sai marcado como IA" nao pode depender de
    // obediencia do modelo.
    const texto = garantirDisclaimer('A peca esta divergente.');

    expect(texto.endsWith(DISCLAIMER_LAUDO)).toBe(true);
  });

  it('should NAO duplicar o disclaimer quando o modelo o escreveu', () => {
    const texto = garantirDisclaimer(
      `A peca esta divergente.\n\n${DISCLAIMER_LAUDO}`,
    );

    expect(texto.split(DISCLAIMER_LAUDO)).toHaveLength(2);
  });

  it('should reconhecer o disclaimer escrito sem acento ou em outra caixa', () => {
    // Variacao boba nao pode virar frase duplicada na tela.
    const texto = garantirDisclaimer(
      'A peca esta divergente.\n\nLaudo redigido por IA a partir do ' +
        'veredito da engine - NAO substitui o veredito.',
    );

    expect(texto).not.toContain(DISCLAIMER_LAUDO);
    expect(texto.toLowerCase()).toContain('nao substitui o veredito');
  });
});
