// Seed = LOTES do protótipo (linhas 927–936).
import type { Lote } from "@/lib/domain/types";

type Linha = [string, string, number, number, Lote["status"], string];

const LINHAS: Linha[] = [
  ["LT-2026-018", "Expansão Rural MS", 6, 35, "processing", "28 ago 2026"],
  ["LT-2026-017", "Rede Vale — Fase 2", 4, 62, "processing", "20 ago 2026"],
  ["LT-2026-016", "Coopercel Oeste", 3, 88, "lowconf", "12 ago 2026"],
  ["LT-2026-015", "CPE Paulista 300", 5, 100, "success", "05 ago 2026"],
  ["LT-2026-014", "Grid NE Subestações", 8, 47, "processing", "02 set 2026"],
  ["LT-2026-013", "Luz do Norte PA", 2, 10, "pending", "15 set 2026"],
  ["LT-2026-012", "Serrana Compactos", 4, 100, "success", "22 jul 2026"],
  ["LT-2026-011", "Eletro Baía Urbano", 6, 74, "processing", "30 ago 2026"],
];

export const LOTES_SEED: Lote[] = LINHAS.map(
  ([id, projetoNome, unidades, progresso, status, previsao]) => ({
    id,
    projetoNome,
    unidades,
    progresso,
    status,
    previsao,
  }),
);
