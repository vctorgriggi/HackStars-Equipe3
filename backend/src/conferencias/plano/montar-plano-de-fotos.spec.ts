import { ItemChecklist } from '../engine/tipos';
import { EtapaResumo } from '../dto/resumos-compartilhados.dto';
import { montarPlanoDeFotos } from './montar-plano-de-fotos';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// O que esta suite protege: o plano de fotos e DERIVADO da checklist e das
// etapas — nenhuma regra propria. Se algum dia alguem reescrever o recorte
// aqui em vez de chamar `filtrarChecklistPorEtapa`, a semantica cumulativa e a
// tolerancia a etapa desconhecida sao o que quebra primeiro.

const ETAPAS: EtapaResumo[] = [
  { codigo: 'adesivacao', nome: 'Adesivacao', ordem: 1 },
  { codigo: 'serigrafia', nome: 'Serigrafia', ordem: 2 },
  { codigo: 'fixacao-placa', nome: 'Fixacao da placa', ordem: 3 },
];

/** Checklist no espirito do seed da demo: a vista `topo` tem DUAS marcacoes. */
const CHECKLIST: ItemChecklist[] = [
  {
    campo: 'serie-chumbada-topo',
    fonteFisica: 'topo',
    obrigatorio: true,
    etapa: 'adesivacao',
  },
  {
    campo: 'patrimonio-serigrafia-topo',
    fonteFisica: 'topo',
    obrigatorio: true,
    etapa: 'serigrafia',
  },
  {
    campo: 'cliente-serigrafia-frente',
    fonteFisica: 'frente',
    obrigatorio: false,
    etapa: 'serigrafia',
  },
  {
    campo: 'serie-placa',
    fonteFisica: 'placa',
    obrigatorio: true,
    etapa: 'fixacao-placa',
  },
];

function planoPadrao(checklist: ItemChecklist[] = CHECKLIST) {
  return montarPlanoDeFotos({
    projeto: { codigo: 'EPT-163-PI-676', descricao: 'Peca de demo' },
    checklist,
    etapas: ETAPAS,
  });
}

function vistasDa(codigoDaEtapa: string, checklist?: ItemChecklist[]) {
  const plano = planoPadrao(checklist);
  const etapa = plano.etapas.find(
    (atual) => atual.etapa?.codigo === codigoDaEtapa,
  );

  return (etapa?.vistas ?? []).map((vista) => ({
    fonteFisica: vista.fonteFisica,
    campos: vista.campos.map((campo) => campo.campo),
  }));
}

describe('montarPlanoDeFotos — agrupamento por vista', () => {
  it('should juntar numa unica vista os campos que saem da mesma foto', () => {
    // O topo tem serie chumbada E patrimonio serigrafado: uma foto so.
    expect(vistasDa('fixacao-placa')).toEqual([
      {
        fonteFisica: 'topo',
        campos: ['serie-chumbada-topo', 'patrimonio-serigrafia-topo'],
      },
      { fonteFisica: 'frente', campos: ['cliente-serigrafia-frente'] },
      { fonteFisica: 'placa', campos: ['serie-placa'] },
    ]);
  });

  it('should ordenar as vistas pela PRIMEIRA aparicao na checklist', () => {
    const foraDeOrdem: ItemChecklist[] = [
      { campo: 'serie-placa', fonteFisica: 'placa', obrigatorio: true },
      { campo: 'serie-chumbada-topo', fonteFisica: 'topo', obrigatorio: true },
      {
        campo: 'patrimonio-serigrafia-topo',
        fonteFisica: 'topo',
        obrigatorio: true,
      },
      { campo: 'patrimonio-placa', fonteFisica: 'placa', obrigatorio: true },
    ];

    expect(
      planoPadrao(foraDeOrdem).pecaInteira.vistas.map(
        (vista) => vista.fonteFisica,
      ),
    ).toEqual(['placa', 'topo']);
  });

  it('should manter a ordem da checklist dentro da vista', () => {
    expect(
      planoPadrao().pecaInteira.vistas[0].campos.map((campo) => campo.campo),
    ).toEqual(['serie-chumbada-topo', 'patrimonio-serigrafia-topo']);
  });
});

describe('montarPlanoDeFotos — recorte cumulativo por etapa', () => {
  it('should pedir no primeiro gate so o que ja existe na peca', () => {
    expect(vistasDa('adesivacao')).toEqual([
      { fonteFisica: 'topo', campos: ['serie-chumbada-topo'] },
    ]);
  });

  it('should acumular no gate seguinte o que as etapas anteriores gravaram', () => {
    // A placa ainda nao existe; o chumbado da adesivacao e RECONFERIDO.
    expect(vistasDa('serigrafia')).toEqual([
      {
        fonteFisica: 'topo',
        campos: ['serie-chumbada-topo', 'patrimonio-serigrafia-topo'],
      },
      { fonteFisica: 'frente', campos: ['cliente-serigrafia-frente'] },
    ]);
  });

  it('should devolver um plano por checkpoint, ordenado pela linha', () => {
    const plano = planoPadrao();

    expect(plano.etapas.map((etapa) => etapa.etapa?.codigo)).toEqual([
      'adesivacao',
      'serigrafia',
      'fixacao-placa',
    ]);
    expect(plano.etapas[0].etapa).toEqual({
      codigo: 'adesivacao',
      nome: 'Adesivacao',
      ordem: 1,
    });
  });

  it('should ordenar as etapas pela ordem mesmo recebendo-as embaralhadas', () => {
    const plano = montarPlanoDeFotos({
      projeto: { codigo: 'EPT-163-PI-676', descricao: null },
      checklist: CHECKLIST,
      etapas: [ETAPAS[2], ETAPAS[0], ETAPAS[1]],
    });

    expect(plano.etapas.map((etapa) => etapa.etapa?.ordem)).toEqual([1, 2, 3]);
  });

  it('should tratar pecaInteira como o recorte SEM etapa', () => {
    const plano = planoPadrao();

    expect(plano.pecaInteira.etapa).toBeNull();
    expect(
      plano.pecaInteira.vistas.flatMap((vista) =>
        vista.campos.map((campo) => campo.campo),
      ),
    ).toEqual(CHECKLIST.map((item) => item.campo));
  });
});

describe('montarPlanoDeFotos — item sem etapa e etapa desconhecida', () => {
  const semEtapa: ItemChecklist[] = [
    { campo: 'serie-chumbada-topo', fonteFisica: 'topo', obrigatorio: true },
    {
      campo: 'serie-placa',
      fonteFisica: 'placa',
      obrigatorio: true,
      etapa: 'fixacao-placa',
    },
  ];

  it('should cobrar em TODOS os gates o item que nao declara etapa', () => {
    const plano = planoPadrao(semEtapa);

    for (const etapa of plano.etapas) {
      expect(
        etapa.vistas.flatMap((vista) =>
          vista.campos.map((campo) => campo.campo),
        ),
      ).toContain('serie-chumbada-topo');
    }
  });

  it('should marcar entraNaEtapa como null quando o item nao declara etapa', () => {
    const [primeiro] = planoPadrao(semEtapa).checklist;

    expect(primeiro.campo).toBe('serie-chumbada-topo');
    expect(primeiro.entraNaEtapa).toBeNull();
  });

  it('should relevar (nunca sumir com) item cuja etapa nao existe como Checkpoint', () => {
    // Checklist inconsistente nao pode derrubar a conferencia, e silenciar o
    // item seria pior: campo obrigatorio sumindo do gate e falso OK.
    const comEtapaFantasma: ItemChecklist[] = [
      {
        campo: 'serie-chumbada-topo',
        fonteFisica: 'topo',
        obrigatorio: true,
        etapa: 'etapa-que-nao-existe',
      },
    ];

    const plano = planoPadrao(comEtapaFantasma);

    expect(plano.checklist[0].entraNaEtapa).toBeNull();
    for (const etapa of plano.etapas) {
      expect(etapa.vistas).toHaveLength(1);
    }
  });

  it('should apontar entraNaEtapa para o checkpoint declarado no item', () => {
    const porCampo = new Map(
      planoPadrao().checklist.map((item) => [item.campo, item.entraNaEtapa]),
    );

    expect(porCampo.get('serie-chumbada-topo')).toEqual({
      codigo: 'adesivacao',
      nome: 'Adesivacao',
      ordem: 1,
    });
    expect(porCampo.get('serie-placa')?.codigo).toBe('fixacao-placa');
  });
});

describe('montarPlanoDeFotos — tipo de marcacao pelo nome do campo', () => {
  it('should classificar chumbado como relevo, serigrafia como tinta e placa como indefinido', () => {
    const porCampo = new Map(
      planoPadrao().checklist.map((item) => [item.campo, item.tipoMarcacao]),
    );

    // `relevo` e o caso que exige enquadramento cuidadoso; `indefinido` na
    // placa e deliberado (ela resolve por rotulo, nao por fisica de pixel).
    expect(porCampo.get('serie-chumbada-topo')).toBe('relevo');
    expect(porCampo.get('patrimonio-serigrafia-topo')).toBe('tinta');
    expect(porCampo.get('cliente-serigrafia-frente')).toBe('tinta');
    expect(porCampo.get('serie-placa')).toBe('indefinido');
  });
});

describe('montarPlanoDeFotos — checklist completa e projeto', () => {
  it('should devolver a checklist inteira na ordem original, sem recorte', () => {
    expect(planoPadrao().checklist.map((item) => item.campo)).toEqual(
      CHECKLIST.map((item) => item.campo),
    );
  });

  it('should repassar obrigatoriedade e vista de cada item', () => {
    const opcional = planoPadrao().checklist.find(
      (item) => item.campo === 'cliente-serigrafia-frente',
    );

    expect(opcional).toMatchObject({
      fonteFisica: 'frente',
      obrigatorio: false,
    });
  });

  it('should ecoar o projeto resolvido', () => {
    expect(planoPadrao().projeto).toEqual({
      codigo: 'EPT-163-PI-676',
      descricao: 'Peca de demo',
    });
  });

  it('should aceitar linha sem nenhum checkpoint cadastrado', () => {
    const plano = montarPlanoDeFotos({
      projeto: { codigo: 'EPT-163-PI-676', descricao: null },
      checklist: CHECKLIST,
      etapas: [],
    });

    // Sem etapas nao ha gate — mas a peca inteira continua fotografavel.
    expect(plano.etapas).toEqual([]);
    expect(plano.pecaInteira.vistas).toHaveLength(3);
  });
});
