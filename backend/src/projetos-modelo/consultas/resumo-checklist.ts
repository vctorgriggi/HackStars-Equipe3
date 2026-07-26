import { ehItemChecklist } from '../../conferencias/conferencia-execucao.service';

export interface ResumoChecklist {
  totalCampos: number;
  camposPorEtapa: Record<string, number>;
}

const SEM_ETAPA = 'sem-etapa';

/**
 * Resume a checklist (string JSON) em contagens para a listagem de projetos.
 * Funcao PURA e TOLERANTE: aqui e leitura de vitrine, nao execucao de
 * conferencia — checklist malformada degrada para zeros (padrao de
 * `indexarChecklist` na releitura do veredito), nunca 500 na listagem; quem
 * cobra checklist valida com erro e o caminho de execucao (`lerChecklist`).
 * Item fora do formato e ignorado, usando `ehItemChecklist` — a validacao
 * UNICA de item do sistema, nunca uma copia local.
 */
export const resumirChecklist = (checklist: string): ResumoChecklist => {
  let bruto: unknown;
  try {
    bruto = JSON.parse(checklist);
  } catch {
    return { totalCampos: 0, camposPorEtapa: {} };
  }

  if (!Array.isArray(bruto)) {
    return { totalCampos: 0, camposPorEtapa: {} };
  }

  const itens = bruto.filter(ehItemChecklist);
  const camposPorEtapa: Record<string, number> = {};
  for (const item of itens) {
    const etapa = item.etapa ?? SEM_ETAPA;
    camposPorEtapa[etapa] = (camposPorEtapa[etapa] ?? 0) + 1;
  }

  return { totalCampos: itens.length, camposPorEtapa };
};
