// Seed = TRAFOS do protótipo (Plataforma Trael.dc.html, linhas 894–909),
// valores exatos.
import type { Transformador } from "@/lib/domain/types";

type Linha = [string, number, string, number, Transformador["status"], string];

const LINHAS: Linha[] = [
  ["TR-847233", 112.5, "EnerSul Distribuidora", 3, "processing", "12 ago 2026"],
  ["TR-847234", 75, "Rede Vale Energia", 1, "processing", "15 ago 2026"],
  ["TR-847240", 150, "Coopercel", 4, "processing", "18 ago 2026"],
  ["TR-847241", 45, "Luz do Norte S.A.", 0, "pending", "22 ago 2026"],
  ["TR-847245", 300, "CPE Paulista", 2, "lowconf", "25 ago 2026"],
  ["TR-847246", 30, "Energia Serrana", 5, "success", "05 ago 2026"],
  ["TR-847250", 112.5, "Grid Nordeste", 3, "mismatch", "28 ago 2026"],
  ["TR-847251", 75, "EnerSul Distribuidora", 2, "processing", "30 ago 2026"],
  ["TR-847252", 225, "Eletro Baía", 1, "processing", "02 set 2026"],
  ["TR-847255", 15, "Coopercel", 0, "pending", "08 set 2026"],
  ["TR-847256", 45, "Rede Vale Energia", 4, "processing", "04 set 2026"],
  ["TR-847257", 150, "CPE Paulista", 5, "success", "01 ago 2026"],
  ["TR-847260", 75, "Grid Nordeste", 2, "processing", "10 set 2026"],
  ["TR-847261", 112.5, "Energia Serrana", 0, "pending", "15 set 2026"],
];

export const TRANSFORMADORES_SEED: Transformador[] = LINHAS.map(
  ([serie, kva, clienteNome, etapaIndex, status, entregaPrevista]) => ({
    serie,
    kva,
    clienteNome,
    etapaIndex,
    status,
    entregaPrevista,
  }),
);
