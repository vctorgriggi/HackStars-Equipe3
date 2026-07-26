// Seed = PROJETOS do protótipo (linhas 937–944).
import type { Projeto } from "@/lib/domain/types";

type Linha = [string, string, number, number, number, string, Projeto["status"]];

const LINHAS: Linha[] = [
  ["Expansão Rural MS", "EnerSul Distribuidora", 2, 10, 42, "set 2026", "processing"],
  ["Rede Vale — Fase 2", "Rede Vale Energia", 1, 4, 62, "ago 2026", "processing"],
  ["Coopercel Oeste", "Coopercel", 1, 3, 88, "ago 2026", "lowconf"],
  ["CPE Paulista 300", "CPE Paulista", 2, 9, 95, "ago 2026", "processing"],
  ["Grid NE Subestações", "Grid Nordeste", 1, 8, 47, "set 2026", "processing"],
  ["Serrana Compactos", "Energia Serrana", 1, 4, 100, "jul 2026", "success"],
];

export const PROJETOS_SEED: Projeto[] = LINHAS.map(
  ([nome, clienteNome, lotes, unidades, progresso, entrega, status], i) => ({
    id: `proj-${i + 1}`,
    nome,
    clienteNome,
    lotes,
    unidades,
    progresso,
    entrega,
    status,
  }),
);
