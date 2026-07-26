import { filtrarChecklistPorEtapa } from './conferencia-execucao.service';
import { ItemChecklist } from './engine/tipos';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// Aqui se testa SO o recorte da checklist por etapa — funcao pura, sem Nest,
// sem banco. As ordens dos checkpoints chegam prontas num Map, do mesmo jeito
// que o servico as monta (uma consulta por codigo distinto, cacheada).

/** Ordens do seed da linha TRAEL (checkpoint-seed.service.ts). */
const ORDENS = new Map<string, number>([
  ['adesivacao', 1],
  ['serigrafia', 2],
  ['oleo-conferencia', 3],
  ['fixacao-placa', 4],
]);

function item(
  campo: string,
  etapa?: string,
  obrigatorio = true,
  fonteFisica = 'placa',
): ItemChecklist {
  return { campo, fonteFisica, obrigatorio, ...(etapa ? { etapa } : {}) };
}

/**
 * Checklist do EPT-163-PI-676 (peca de demo), na MESMA ordem em que o seed a
 * grava — `fonteFisica` e a VISTA da peca, e o patrimonio serigrafado aparece
 * em DUAS vistas (topo e frente), como o desenho pede.
 */
const CHECKLIST_DEMO: ItemChecklist[] = [
  item('serie-chumbada-topo', 'adesivacao', true, 'topo'),
  item('serie-chumbada-lateral-direita', 'adesivacao', true, 'lateral-direita'),
  item('serie-chumbada-traseira', 'adesivacao', true, 'traseira'),
  item('patrimonio-serigrafia-topo', 'serigrafia', true, 'topo'),
  item('patrimonio-serigrafia-frente', 'serigrafia', true, 'frente'),
  item('cliente-serigrafia-frente', 'serigrafia', true, 'frente'),
  item('potencia-serigrafia-frente', 'serigrafia', false, 'frente'),
  item('serie-placa', 'fixacao-placa', true, 'placa'),
  item('patrimonio-placa', 'fixacao-placa', true, 'placa'),
];

function campos(itens: ItemChecklist[]): string[] {
  return itens.map((atual) => atual.campo);
}

describe('filtrarChecklistPorEtapa — recorte cumulativo por etapa', () => {
  it('should cobrar so as series chumbadas no gate da adesivacao', () => {
    const recorte = filtrarChecklistPorEtapa(CHECKLIST_DEMO, 1, ORDENS);

    expect(campos(recorte.itens)).toEqual([
      'serie-chumbada-topo',
      'serie-chumbada-lateral-direita',
      'serie-chumbada-traseira',
    ]);
    expect(recorte.etapasDesconhecidas).toEqual([]);
  });

  it('should acumular chumbados e serigrafia no gate da serigrafia', () => {
    const recorte = filtrarChecklistPorEtapa(CHECKLIST_DEMO, 2, ORDENS);

    expect(campos(recorte.itens)).toEqual([
      'serie-chumbada-topo',
      'serie-chumbada-lateral-direita',
      'serie-chumbada-traseira',
      'patrimonio-serigrafia-topo',
      'patrimonio-serigrafia-frente',
      'cliente-serigrafia-frente',
      'potencia-serigrafia-frente',
    ]);
  });

  it('should cobrar a checklist inteira no gate da fixacao da placa', () => {
    const recorte = filtrarChecklistPorEtapa(CHECKLIST_DEMO, 4, ORDENS);

    expect(campos(recorte.itens)).toEqual(campos(CHECKLIST_DEMO));
  });

  it('should reconferir as etapas anteriores em etapa intermediaria sem itens proprios', () => {
    // Enchimento de oleo (ordem 3) nao adiciona marcacao nenhuma, mas o gate
    // continua reconferindo o que ja existe na peca — e assim que se detecta
    // troca de peca entre etapas.
    const recorte = filtrarChecklistPorEtapa(CHECKLIST_DEMO, 3, ORDENS);

    expect(campos(recorte.itens)).toEqual([
      'serie-chumbada-topo',
      'serie-chumbada-lateral-direita',
      'serie-chumbada-traseira',
      'patrimonio-serigrafia-topo',
      'patrimonio-serigrafia-frente',
      'cliente-serigrafia-frente',
      'potencia-serigrafia-frente',
    ]);
  });

  it('should avaliar a checklist inteira quando o request nao traz etapa', () => {
    const recorte = filtrarChecklistPorEtapa(CHECKLIST_DEMO, null, ORDENS);

    expect(campos(recorte.itens)).toEqual(campos(CHECKLIST_DEMO));
    expect(recorte.etapasDesconhecidas).toEqual([]);
  });

  it('should incluir sempre o item sem etapa, mesmo no primeiro gate', () => {
    // Compatibilidade com checklist antiga (gravada antes do campo `etapa`).
    const checklist = [
      item('serie-chumbada-topo', 'adesivacao', true, 'topo'),
      item('serie-placa', 'fixacao-placa'),
      item('campo-legado'),
    ];

    const recorte = filtrarChecklistPorEtapa(checklist, 1, ORDENS);

    expect(campos(recorte.itens)).toEqual([
      'serie-chumbada-topo',
      'campo-legado',
    ]);
  });

  it('should tratar etapa vazia como item sem etapa', () => {
    const recorte = filtrarChecklistPorEtapa(
      [item('serie-placa', '   ')],
      1,
      ORDENS,
    );

    expect(campos(recorte.itens)).toEqual(['serie-placa']);
    expect(recorte.etapasDesconhecidas).toEqual([]);
  });

  it('should incluir o item cuja etapa nao existe no banco e reportar o codigo', () => {
    // Dado de checklist inconsistente nao pode derrubar a conferencia nem
    // fazer campo obrigatorio sumir do gate (falso OK).
    const checklist = [
      item('serie-chumbada-topo', 'adesivacao', true, 'topo'),
      item('serie-placa', 'etapa-inexistente'),
      item('patrimonio-placa', 'etapa-inexistente'),
    ];

    const recorte = filtrarChecklistPorEtapa(checklist, 1, ORDENS);

    expect(campos(recorte.itens)).toEqual([
      'serie-chumbada-topo',
      'serie-placa',
      'patrimonio-placa',
    ]);
    // Codigo desconhecido sai uma vez so, por mais itens que o citem.
    expect(recorte.etapasDesconhecidas).toEqual(['etapa-inexistente']);
  });

  it('should devolver recorte vazio quando nenhum item alcanca a etapa', () => {
    // Checklist mal configurada: quem trata e o servico (422), a funcao pura
    // so relata o que sobrou.
    const recorte = filtrarChecklistPorEtapa(
      [item('serie-placa', 'fixacao-placa')],
      1,
      ORDENS,
    );

    expect(recorte.itens).toEqual([]);
  });

  it('should preservar a checklist recebida sem mutar', () => {
    const original = [...CHECKLIST_DEMO];

    filtrarChecklistPorEtapa(CHECKLIST_DEMO, 2, ORDENS);

    expect(CHECKLIST_DEMO).toEqual(original);
  });
});
