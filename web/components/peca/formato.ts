/**
 * Formatação de EXIBIÇÃO da tela da peça — texto, nunca decisão.
 *
 * Nada aqui compara campo, aplica limiar ou deriva veredito (regra de ouro):
 * são funções de apresentação sobre dados que a API já decidiu. O único
 * "mapeamento" é o de rótulo de vista, e ele vem pronto de `@/lib/tipos`
 * (`ROTULO_FONTE_FISICA`) — a tela não inventa vocabulário.
 *
 * Os nomes de campo (`serie-chumbada-lateral-direita`) são apenas
 * HUMANIZADOS: hífen vira espaço, primeira letra maiúscula. De propósito não
 * existe tabela de tradução por campo — deduzir significado do nome do campo é
 * trabalho do backend (gap 19 do CLAUDE.md), e uma tabela aqui ficaria
 * desatualizada no primeiro modelo novo. O nome cru continua visível ao lado.
 */

import { ROTULO_FONTE_FISICA, type FonteFisica } from "@/lib/tipos";

const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const DIA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const PORCENTO = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function comoData(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** `26/07/2026 13:02` — carimbo completo do evento. */
export function formatarDataHora(iso: string | null | undefined): string {
  const data = comoData(iso);
  return data ? DATA_HORA.format(data) : "—";
}

/** `13:02:11` — a hora sozinha, para a linha do tempo já agrupada por dia. */
export function formatarHora(iso: string | null | undefined): string {
  const data = comoData(iso);
  return data ? HORA.format(data) : "—";
}

/** `26/07/2026` — cabeçalho de grupo da linha do tempo. */
export function formatarDia(iso: string | null | undefined): string {
  const data = comoData(iso);
  return data ? DIA.format(data) : "Data desconhecida";
}

/**
 * `0.998` → `99,8%`. Devolve `null` quando não houve leitura — a tela mostra um
 * traço, e nunca um `0%` que pareceria uma medição ruim em vez de ausência.
 */
export function formatarConfianca(
  valor: number | null | undefined,
): string | null {
  if (typeof valor !== "number" || Number.isNaN(valor)) return null;
  return PORCENTO.format(valor);
}

/** Rótulo da VISTA da peça; cai para a string crua se o vocabulário crescer. */
export function rotuloDaVista(fonte: string | null | undefined): string | null {
  if (!fonte) return null;
  return ROTULO_FONTE_FISICA[fonte as FonteFisica] ?? fonte;
}

/** `serie-chumbada-topo` → `Serie chumbada topo` (só cosmética). */
export function humanizarCampo(campo: string): string {
  const texto = campo.replaceAll("-", " ").trim();
  if (!texto) return campo;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Como escrever a etapa de uma conferência. `null` NÃO é "sem informação": é a
 * conferência da peça inteira (checklist sem recorte) — e a diferença importa,
 * porque `conforme` de gate parcial não atesta a peça toda (gap 14).
 */
export function descreverEtapa(
  checkpoint: { nome: string; ordem?: number } | null | undefined,
): string {
  if (!checkpoint) return "Peça inteira";
  return typeof checkpoint.ordem === "number"
    ? `${checkpoint.ordem}. ${checkpoint.nome}`
    : checkpoint.nome;
}
