// Seed = NOTIFS do protótipo (linhas 1089–1094).
import type { Notificacao } from "@/lib/domain/types";

export const NOTIFICACOES_SEED: Notificacao[] = [
  {
    id: "not-1",
    mensagem:
      "Linha parada — divergência de chassi no checkpoint Ensaios (TR-847250)",
    quando: "há 4 min",
    status: "mismatch",
    lida: false,
  },
  {
    id: "not-2",
    mensagem:
      "Divergência de leitura na serigrafia de TR-847245 — verificação manual",
    quando: "há 26 min",
    status: "lowconf",
    lida: false,
  },
  {
    id: "not-3",
    mensagem: "Lote LT-2026-015 concluído — 5 unidades aprovadas",
    quando: "há 2 h",
    status: "success",
    lida: false,
  },
  {
    id: "not-4",
    mensagem: "Entrega de TR-847246 prevista para 05 ago — expedição agendada",
    quando: "há 5 h",
    status: "processing",
    lida: false,
  },
];
