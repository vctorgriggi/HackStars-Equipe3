import {
  EtapaDaLinha,
  montarOcupacao,
  totaisDaOcupacao,
  UltimaPassagemDaPeca,
} from './montar-ocupacao';

// Nota de lint: todo `it` comeca com "should"; o resto da frase em portugues.
//
// Funcao PURA da ocupacao da esteira: as queries entregam linhas cruas, a
// montagem e testada aqui, sem banco.

const GERADO_EM = '2026-07-26T12:00:00.000Z';

/** Seed real da linha TRAEL, deliberadamente fora de ordem na entrada. */
const ETAPAS: EtapaDaLinha[] = [
  { codigo: 'serigrafia', nome: 'Serigrafia', ordem: 2 },
  { codigo: 'adesivacao', nome: 'Adesivacao', ordem: 1 },
  { codigo: 'fixacao-placa', nome: 'Fixacao da placa', ordem: 4 },
  { codigo: 'oleo-conferencia', nome: 'Oleo e conferencia', ordem: 3 },
];

function pecaEm(
  numeroSerie: string,
  checkpointCodigo: string,
  em = '2026-07-26T10:00:00.000Z',
): UltimaPassagemDaPeca {
  return { numeroSerie, patrimonio: null, em, checkpointCodigo };
}

describe('montarOcupacao', () => {
  it('should listar todos os checkpoints ordenados por ordem, mesmo vazios', () => {
    const snapshot = montarOcupacao({
      etapas: ETAPAS,
      pecas: [],
      geradoEm: GERADO_EM,
    });

    expect(snapshot.checkpoints.map((c) => c.codigo)).toEqual([
      'adesivacao',
      'serigrafia',
      'oleo-conferencia',
      'fixacao-placa',
    ]);
    // Vazio NAO e ausente: o box da etapa existe com total 0.
    expect(snapshot.checkpoints.every((c) => c.total === 0)).toBe(true);
    expect(snapshot.totalNaLinha).toBe(0);
    expect(snapshot.geradoEm).toBe(GERADO_EM);
  });

  it('should contar cada peca apenas no checkpoint da ultima passagem', () => {
    const snapshot = montarOcupacao({
      etapas: ETAPAS,
      pecas: [
        pecaEm('847233', 'serigrafia'),
        pecaEm('847234', 'serigrafia'),
        pecaEm('847235', 'adesivacao'),
      ],
      geradoEm: GERADO_EM,
    });

    const totais = Object.fromEntries(
      snapshot.checkpoints.map((c) => [c.codigo, c.total]),
    );
    expect(totais).toEqual({
      adesivacao: 1,
      serigrafia: 2,
      'oleo-conferencia': 0,
      'fixacao-placa': 0,
    });
    expect(snapshot.totalNaLinha).toBe(3);
  });

  it('should ordenar as pecas de cada checkpoint da mais antiga para a mais recente', () => {
    const snapshot = montarOcupacao({
      etapas: ETAPAS,
      pecas: [
        pecaEm('847234', 'serigrafia', '2026-07-26T11:00:00.000Z'),
        pecaEm('847233', 'serigrafia', '2026-07-26T09:00:00.000Z'),
      ],
      geradoEm: GERADO_EM,
    });

    const serigrafia = snapshot.checkpoints.find(
      (c) => c.codigo === 'serigrafia',
    );
    expect(serigrafia?.pecas.map((p) => p.numeroSerie)).toEqual([
      '847233',
      '847234',
    ]);
  });

  it('should omitir peca cuja ultima passagem aponta checkpoint desconhecido', () => {
    // Checkpoint apagado depois do scan: nao ha box para desenhar a peca, e
    // inventar um seria afirmar o que nao se sabe.
    const snapshot = montarOcupacao({
      etapas: ETAPAS,
      pecas: [pecaEm('847233', 'etapa-que-nao-existe')],
      geradoEm: GERADO_EM,
    });

    expect(snapshot.totalNaLinha).toBe(0);
  });
});

describe('totaisDaOcupacao', () => {
  it('should derivar os totais do evento na mesma ordem dos checkpoints', () => {
    const snapshot = montarOcupacao({
      etapas: ETAPAS,
      pecas: [pecaEm('847233', 'oleo-conferencia')],
      geradoEm: GERADO_EM,
    });

    expect(totaisDaOcupacao(snapshot)).toEqual([
      { codigo: 'adesivacao', total: 0 },
      { codigo: 'serigrafia', total: 0 },
      { codigo: 'oleo-conferencia', total: 1 },
      { codigo: 'fixacao-placa', total: 0 },
    ]);
  });
});
