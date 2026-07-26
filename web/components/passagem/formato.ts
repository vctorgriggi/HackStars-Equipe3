/**
 * Formatação de data e hora da tela de passagem.
 *
 * Existe como módulo separado por um motivo prático: a hora aparece em três
 * lugares (cartão do scan, alerta da última conferência e fila da sessão) e
 * precisa ser sempre a mesma — "14:32" num lugar e "2:32 PM" no outro faria o
 * operador achar que são eventos diferentes.
 *
 * Nada aqui decide nada: converte o ISO que a API mandou. Data inválida vira
 * `—`, nunca `Invalid Date` na cara do operador.
 */

const HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function comoData(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** `14:32:05` — a hora do evento que acabou de acontecer. */
export function formatarHora(iso: string | null | undefined): string {
  const data = comoData(iso);
  return data ? HORA.format(data) : "—";
}

/** `26/07/2026` — a data, para quando o evento não é de agora. */
export function formatarData(iso: string | null | undefined): string {
  const data = comoData(iso);
  return data ? DATA.format(data) : "—";
}

/** `26/07/2026 14:32` — usado no alerta (a conferência pode ser de ontem). */
export function formatarDataHora(iso: string | null | undefined): string {
  const data = comoData(iso);
  return data ? DATA_HORA.format(data) : "—";
}
