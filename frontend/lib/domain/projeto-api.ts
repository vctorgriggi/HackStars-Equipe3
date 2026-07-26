// Espelho manual de `ProjetoModeloComContadores` (backend,
// projetos-modelo/consultas/projeto-modelo-com-contadores.ts).

export interface ProjetoModeloComContadoresApi {
  id: string;
  /** Código do desenho (ex.: EPT-163-PI-676) — identificador estável. */
  codigo: string;
  descricao: string | null;
  /** Checklist crua (string JSON), mantida por compatibilidade; as contagens
   *  abaixo já vêm resumidas do servidor. */
  checklist: string;
  /** Peças (transformadores) vinculadas a este projeto. */
  totalPecas: number;
  /** Itens VÁLIDOS da checklist (checklist ilegível resume a zero). */
  totalCampos: number;
  /** Contagem por etapa; chave = `codigo` do Checkpoint, `sem-etapa` agrupa
   *  itens conferidos em qualquer etapa. */
  camposPorEtapa: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}
