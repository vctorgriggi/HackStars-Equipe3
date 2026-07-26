// Seed = cfgNotif do protótipo ([true, true, false, true]).
import type { ConfigNotificacoes } from "@/lib/domain/types";

export const CONFIG_SEED: ConfigNotificacoes = {
  paradaLinha: true,
  divergencia: true,
  resumoDiario: false,
  entregasProximas: true,
};

/** Copy da tela Configurações (protótipo, linhas 1297–1302). */
export const CONFIG_ROTULOS: {
  key: keyof ConfigNotificacoes;
  nome: string;
  desc: string;
}[] = [
  {
    key: "paradaLinha",
    nome: "Parada de linha",
    desc: "Alerta imediato quando um checkpoint reprova uma leitura",
  },
  {
    key: "divergencia",
    nome: "Divergência de leitura",
    desc: "Quando a confiança fica abaixo do limiar da etapa",
  },
  {
    key: "resumoDiario",
    nome: "Resumo diário",
    desc: "Produção, aprovações e paradas do dia por e-mail",
  },
  {
    key: "entregasProximas",
    nome: "Entregas próximas",
    desc: "Transformadores a 3 dias da data prevista",
  },
];
