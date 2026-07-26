// Seed = CLIENTES do protótipo (linhas 910–922), incluindo a derivação das
// iniciais.
import type { Cliente } from "@/lib/domain/types";

type Linha = [string, string, string, number, number];

const LINHAS: Linha[] = [
  ["EnerSul Distribuidora", "Campo Grande · MS", "compras@enersul.com.br", 4, 23],
  ["Rede Vale Energia", "Belo Horizonte · MG", "suprimentos@redevale.com.br", 3, 31],
  ["Coopercel", "Chapecó · SC", "engenharia@coopercel.coop.br", 2, 12],
  ["CPE Paulista", "Campinas · SP", "pedidos@cpepaulista.com.br", 3, 40],
  ["Grid Nordeste", "Recife · PE", "compras@gridne.com.br", 2, 17],
  ["Energia Serrana", "Caxias do Sul · RS", "contato@energiaserrana.com.br", 2, 9],
  ["Luz do Norte S.A.", "Belém · PA", "suprimentos@luzdonorte.com.br", 1, 14],
  ["Eletro Baía", "Salvador · BA", "compras@eletrobaia.com.br", 1, 21],
];

export const CLIENTES_SEED: Cliente[] = LINHAS.map(
  ([nome, cidadeUf, email, emProducao, entregues], i) => ({
    id: `cli-${i + 1}`,
    nome,
    cidadeUf,
    email,
    emProducao,
    entregues,
    iniciais: nome
      .split(" ")
      .map((p) => p[0])
      .join("")
      .replace(/[^A-ZÀ-Ú]/g, "")
      .slice(0, 2)
      .toUpperCase(),
  }),
);
