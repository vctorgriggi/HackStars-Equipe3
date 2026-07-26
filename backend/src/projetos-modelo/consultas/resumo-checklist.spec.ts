import { resumirChecklist } from './resumo-checklist';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.

const item = (campo: string, etapa?: string | null) => ({
  campo,
  fonteFisica: 'topo',
  obrigatorio: true,
  ...(etapa === undefined ? {} : { etapa }),
});

describe('resumirChecklist', () => {
  it('should contar itens validos no total e por etapa', () => {
    const checklist = JSON.stringify([
      item('serie-chumbada-topo', 'adesivacao'),
      item('serie-chumbada-lateral-direita', 'adesivacao'),
      item('patrimonio-serigrafia-topo', 'serigrafia'),
      item('serie-placa', 'fixacao-placa'),
    ]);

    expect(resumirChecklist(checklist)).toEqual({
      totalCampos: 4,
      camposPorEtapa: {
        adesivacao: 2,
        serigrafia: 1,
        'fixacao-placa': 1,
      },
    });
  });

  it('should agrupar item sem etapa (ausente ou null) em sem-etapa', () => {
    const checklist = JSON.stringify([
      item('serie-chumbada-topo'),
      item('patrimonio-placa', null),
      item('serie-placa', 'fixacao-placa'),
    ]);

    expect(resumirChecklist(checklist)).toEqual({
      totalCampos: 3,
      camposPorEtapa: {
        'sem-etapa': 2,
        'fixacao-placa': 1,
      },
    });
  });

  it('should degradar checklist com JSON malformado para zeros, sem lancar', () => {
    expect(resumirChecklist('nao-e-json{')).toEqual({
      totalCampos: 0,
      camposPorEtapa: {},
    });
  });

  it('should degradar checklist que nao e array para zeros', () => {
    expect(resumirChecklist('{"campo":"serie-placa"}')).toEqual({
      totalCampos: 0,
      camposPorEtapa: {},
    });
  });

  it('should ignorar item fora do formato sem descartar os validos', () => {
    const checklist = JSON.stringify([
      item('serie-placa', 'fixacao-placa'),
      { campo: '', fonteFisica: 'placa', obrigatorio: true },
      { qualquer: 'coisa' },
      42,
    ]);

    expect(resumirChecklist(checklist)).toEqual({
      totalCampos: 1,
      camposPorEtapa: { 'fixacao-placa': 1 },
    });
  });
});
