import { Conferencia } from '../../conferencias/domain/conferencia';

/**
 * Projecao de LEITURA de uma conferencia nas telas centradas na peca (scan em
 * checkpoint e historico). Existe por dois motivos:
 *
 * 1. gap 3 do CLAUDE.md — as relacoes geradas sao `eager`, entao devolver a
 *    entidade inteira arrastaria peca + checkpoint + projeto em cada item;
 * 2. o front nao recalcula nada (regra de ouro): `vereditoGeral` chega pronto,
 *    do jeito que a engine gravou.
 *
 * `etapa` acompanha o veredito de proposito (gap 14): "ultima conferencia
 * conforme" NAO atesta peca completa — pode ser o conforme parcial de um gate.
 * Quem exibe o alerta precisa ver as duas coisas juntas.
 */
export interface ConferenciaResumo {
  id: string;
  vereditoGeral: string | null;
  createdAt: Date;
  checkpoint: { codigo: string; nome: string } | null;
}

export function resumirConferencia(
  conferencia: Conferencia,
): ConferenciaResumo {
  return {
    id: conferencia.id,
    vereditoGeral: conferencia.vereditoGeral ?? null,
    createdAt: conferencia.createdAt,
    checkpoint: conferencia.checkpoint
      ? {
          codigo: conferencia.checkpoint.codigo,
          nome: conferencia.checkpoint.nome,
        }
      : null,
  };
}
