import { tipoDeMarcacaoDoCampo } from '../../extracao/ports/marcacao';
import { filtrarChecklistPorEtapa } from '../conferencia-execucao.service';
import { ItemChecklist } from '../engine/tipos';
import {
  ItemDoPlano,
  PlanoDaEtapa,
  PlanoDeFotos,
  VistaDoPlano,
} from '../dto/plano-de-fotos.dto';
import { EtapaResumo } from '../dto/resumos-compartilhados.dto';

/**
 * Checklist + etapas da linha -> plano de fotos por gate. FUNÇÃO PURA: recebe
 * o que já foi lido do banco e não toca repositório, storage nem AWS.
 *
 * REGRA NOVA AQUI: NENHUMA. O recorte de cada etapa sai de
 * `filtrarChecklistPorEtapa` — a MESMA função que a execução da conferência
 * usa — e o tipo de marcação sai de `tipoDeMarcacaoDoCampo`, a mesma que o
 * adapter de visão consulta. É esse reuso que dá a garantia que motivou o
 * endpoint: a lista de fotos que a tela pede é, por construção, a lista de
 * campos que aquele gate vai cobrar. Reimplementar o recorte no cliente já
 * tinha produzido as duas divergindo.
 *
 * O que a função DECIDE, e por quê:
 * - agrupa por VISTA porque a unidade de captura é a foto, não o campo: o topo
 *   tem série chumbada e patrimônio serigrafado, e uma foto resolve os dois;
 * - preserva a ordem da checklist (vistas na ordem de PRIMEIRA aparição,
 *   campos na ordem original) — a checklist é escrita na sequência em que se
 *   anda em volta da peça, e reordenar por nome mandaria o operador dar voltas;
 * - ordena as etapas por `ordem` (com `codigo` de desempate, já que `ordem` não
 *   tem unique — gap 15), porque é a ordem que define o recorte cumulativo.
 */
export function montarPlanoDeFotos(entrada: {
  projeto: { codigo: string; descricao: string | null };
  checklist: ItemChecklist[];
  etapas: EtapaResumo[];
}): PlanoDeFotos {
  const etapasOrdenadas = [...entrada.etapas].sort(
    (a, b) => a.ordem - b.ordem || a.codigo.localeCompare(b.codigo),
  );

  const ordensPorCodigo = new Map(
    etapasOrdenadas.map((etapa) => [etapa.codigo, etapa.ordem]),
  );

  // Índice para `entraNaEtapa`: a etapa DECLARADA no item, quando ela existe
  // como Checkpoint. Item sem etapa (ou com etapa desconhecida) fica `null` —
  // e o filtro o mantém em todos os recortes, que é a mesma decisão tomada na
  // execução (silenciar o item seria pior que relevá-lo).
  const etapasPorCodigo = new Map(
    etapasOrdenadas.map((etapa) => [etapa.codigo, etapa]),
  );

  const paraItem = (item: ItemChecklist): ItemDoPlano => {
    const codigoDaEtapa = item.etapa?.trim();

    return {
      campo: item.campo,
      fonteFisica: item.fonteFisica,
      obrigatorio: item.obrigatorio,
      tipoMarcacao: tipoDeMarcacaoDoCampo(item.campo),
      entraNaEtapa:
        codigoDaEtapa === undefined || codigoDaEtapa.length === 0
          ? null
          : (etapasPorCodigo.get(codigoDaEtapa) ?? null),
    };
  };

  const recortar = (
    etapa: EtapaResumo | null,
    ordemDaEtapa: number | null,
  ): PlanoDaEtapa => ({
    etapa,
    vistas: agruparPorVista(
      filtrarChecklistPorEtapa(
        entrada.checklist,
        ordemDaEtapa,
        ordensPorCodigo,
      ).itens.map(paraItem),
    ),
  });

  return {
    projeto: entrada.projeto,
    checklist: entrada.checklist.map(paraItem),
    etapas: etapasOrdenadas.map((etapa) => recortar(etapa, etapa.ordem)),
    // `ordemDaEtapa: null` é o contrato de "sem etapa" do filtro: devolve a
    // checklist inteira, exatamente como a conferência sem `etapaCodigo`.
    pecaInteira: recortar(null, null),
  };
}

/**
 * Campos -> vistas, na ordem de primeira aparição. Map preserva a ordem de
 * inserção, então nada de sort: a ordem da checklist É a resposta.
 */
function agruparPorVista(campos: ItemDoPlano[]): VistaDoPlano[] {
  const porVista = new Map<string, VistaDoPlano>();

  for (const campo of campos) {
    const atual = porVista.get(campo.fonteFisica);
    if (atual) {
      atual.campos.push(campo);
      continue;
    }

    porVista.set(campo.fonteFisica, {
      fonteFisica: campo.fonteFisica,
      campos: [campo],
    });
  }

  return [...porVista.values()];
}
