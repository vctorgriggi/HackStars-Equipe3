import {
  EsteiraSnapshot,
  OcupacaoCheckpoint,
} from '../dto/esteira-snapshot.dto';
import { TotalDoCheckpoint } from '../dto/evento-passagem-registrada.dto';

/** Um checkpoint da linha, como sai da query (colunas cruas). */
export interface EtapaDaLinha {
  codigo: string;
  nome: string;
  ordem: number;
}

/** A ultima passagem de uma peca, como sai da query (colunas cruas). */
export interface UltimaPassagemDaPeca {
  numeroSerie: string;
  patrimonio: string | null;
  em: string;
  /** `codigo` do checkpoint da ultima passagem — a posicao atual da peca. */
  checkpointCodigo: string;
}

/**
 * (checkpoints da linha) + (ultima passagem de cada peca) → ocupacao da
 * esteira. Funcao PURA (testavel sem banco), no padrao de
 * `montar-indicadores.ts`: as queries trazem linhas cruas, a montagem mora
 * aqui.
 *
 * Checkpoint sem peca APARECE com total 0 — a etapa existe mesmo vazia.
 * Peca cuja ultima passagem aponta para checkpoint fora da lista (apagado
 * depois do scan) e omitida: nao ha box para desenha-la, e inventar um seria
 * afirmar o que nao se sabe.
 */
export function montarOcupacao(entrada: {
  etapas: EtapaDaLinha[];
  pecas: UltimaPassagemDaPeca[];
  geradoEm: string;
}): EsteiraSnapshot {
  const porCodigo = new Map<string, OcupacaoCheckpoint>();

  const checkpoints = [...entrada.etapas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((etapa) => {
      const ocupacao: OcupacaoCheckpoint = {
        codigo: etapa.codigo,
        nome: etapa.nome,
        ordem: etapa.ordem,
        total: 0,
        pecas: [],
      };
      porCodigo.set(etapa.codigo, ocupacao);
      return ocupacao;
    });

  const pecasOrdenadas = [...entrada.pecas].sort((a, b) =>
    a.em === b.em
      ? compararTexto(a.numeroSerie, b.numeroSerie)
      : compararTexto(a.em, b.em),
  );

  let totalNaLinha = 0;
  for (const peca of pecasOrdenadas) {
    const ocupacao = porCodigo.get(peca.checkpointCodigo);
    if (!ocupacao) {
      continue;
    }
    ocupacao.pecas.push({
      numeroSerie: peca.numeroSerie,
      patrimonio: peca.patrimonio,
      em: peca.em,
    });
    ocupacao.total += 1;
    totalNaLinha += 1;
  }

  return { checkpoints, totalNaLinha, geradoEm: entrada.geradoEm };
}

/** Snapshot → os totais que o evento `passagem-registrada` carrega. */
export function totaisDaOcupacao(
  snapshot: EsteiraSnapshot,
): TotalDoCheckpoint[] {
  return snapshot.checkpoints.map((checkpoint) => ({
    codigo: checkpoint.codigo,
    total: checkpoint.total,
  }));
}

function compararTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
