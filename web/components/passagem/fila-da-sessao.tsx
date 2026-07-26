"use client";

/**
 * A FILA DESTA SESSÃO: as últimas peças que passaram por este aparelho.
 *
 * Por que existe: no gate real as peças chegam em sequência (às vezes em dupla,
 * na mesma esteira). O operador escaneia uma atrás da outra e precisa de duas
 * garantias que a tela de resultado sozinha não dá:
 *
 * 1. **conferência do que já passou** — "a anterior era a 847233 mesmo?"
 *    sem ter de reescanear a peça, que já seguiu na linha;
 * 2. **o alerta não some da vista** — a peça divergente que passou há três
 *    scans continua listada em vermelho, mesmo depois de a tela voltar ao
 *    scanner.
 *
 * IMPLEMENTAÇÃO: store externo em memória de módulo lido com
 * `useSyncExternalStore`, mesmo padrão de `lib/etapa.ts`. Não é `useState` da
 * página por um motivo concreto: o operador toca "ver a peça", vai para
 * `/peca`, volta — e a fila tem de continuar lá. Não é `localStorage` de
 * propósito: "sessão" é enquanto a aba estiver aberta; passagem persistida é
 * responsabilidade do banco, e o histórico verdadeiro mora em
 * `GET /transformadores/:id/passagens`.
 *
 * Esta lista NÃO é fonte de verdade de nada: é eco do que a API respondeu.
 */

import { useSyncExternalStore } from "react";
import Link from "next/link";

import { Botao, Cartao, CabecalhoCartao, SeloVeredito } from "@/components/ui";
import { juntarClasses } from "@/lib/classes";
import type { ResultadoRegistroPassagem } from "@/lib/tipos";
import { comoVeredito } from "@/lib/tipos";

import { formatarHora } from "./formato";

/** Uma linha da fila — só o que a lista mostra, nada de objeto inteiro. */
export interface ItemDaFila {
  /** Id da passagem gravada: chave estável de lista. */
  id: string;
  numeroSerie: string;
  /** Nome da etapa em que o scan foi registrado. */
  etapaNome: string;
  createdAt: string;
  /** `vereditoGeral` da última conferência da peça — como a API mandou. */
  veredito: string | null;
  /** Etapa daquele veredito; `null` = conferência da peça inteira (gap 14). */
  etapaDoVeredito: string | null;
  /** `true` quando a peça nunca foi conferida (não é o mesmo que sem veredito). */
  semConferencia: boolean;
  observacao: string | null;
}

/** Quantas passagens a sessão guarda (a lista mostra menos; ver `VISIVEIS`). */
const LIMITE = 25;

/** Quantas aparecem sem rolar a tela — o resto vira contagem. */
const VISIVEIS = 6;

const VAZIA: readonly ItemDaFila[] = [];

let fila: readonly ItemDaFila[] = VAZIA;
const ouvintes = new Set<() => void>();

function avisar(): void {
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Converte a resposta da API na linha da fila (sem interpretar veredito). */
export function itemDaFila(resultado: ResultadoRegistroPassagem): ItemDaFila {
  return {
    id: resultado.passagem.id,
    numeroSerie: resultado.transformador.numeroSerie,
    etapaNome: resultado.checkpoint.nome,
    createdAt: resultado.passagem.createdAt,
    veredito: resultado.ultimaConferencia?.vereditoGeral ?? null,
    etapaDoVeredito: resultado.ultimaConferencia?.checkpoint?.nome ?? null,
    semConferencia: resultado.ultimaConferencia === null,
    observacao: resultado.passagem.observacao,
  };
}

/** Empilha uma passagem no topo da fila desta sessão. */
export function registrarNaFila(item: ItemDaFila): void {
  fila = [item, ...fila.filter((atual) => atual.id !== item.id)].slice(0, LIMITE);
  avisar();
}

export function limparFila(): void {
  if (fila === VAZIA) return;
  fila = VAZIA;
  avisar();
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

const lerFila = () => fila;
// Referência ESTÁVEL no servidor: devolver `[]` novo a cada chamada faria o
// `useSyncExternalStore` acusar loop infinito na renderização de servidor.
const lerFilaDoServidor = () => VAZIA;

export function useFilaDaSessao(): readonly ItemDaFila[] {
  return useSyncExternalStore(assinar, lerFila, lerFilaDoServidor);
}

/* ------------------------------------------------------------------ *
 * Lista
 * ------------------------------------------------------------------ */

const FUNDO_POR_VEREDITO: Record<string, string> = {
  divergente: "border-l-4 border-l-divergente bg-divergente-fundo/50",
  nao_conferivel: "border-l-4 border-l-nao-conferivel bg-nao-conferivel-fundo/40",
  conforme: "border-l-4 border-l-conforme",
};

export function FilaDaSessao() {
  const fila = useFilaDaSessao();
  if (fila.length === 0) return null;

  const visiveis = fila.slice(0, VISIVEIS);
  const ocultas = fila.length - visiveis.length;

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Passagens desta sessão"
        descricao="O que este aparelho registrou desde que a tela abriu. O histórico completo da peça fica na tela dela."
        acao={
          <Botao
            variante="fantasma"
            onClick={limparFila}
            className="min-h-10 px-2 text-xs"
          >
            Limpar
          </Botao>
        }
      />

      <ul className="space-y-2">
        {visiveis.map((item) => {
          const classe = comoVeredito(item.veredito);

          return (
            <li key={item.id}>
              <Link
                href={`/peca?numeroSerie=${encodeURIComponent(item.numeroSerie)}`}
                className={juntarClasses(
                  "flex min-h-14 items-center gap-3 rounded-xl border border-borda",
                  "bg-superficie px-3 py-2 transition-colors hover:bg-superficie-2",
                  classe ? FUNDO_POR_VEREDITO[classe] : undefined,
                )}
              >
                <span className="numeros shrink-0 text-xs text-conteudo-suave">
                  {formatarHora(item.createdAt)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="numeros block truncate text-base font-semibold text-conteudo">
                    {item.numeroSerie}
                  </span>
                  <span className="block truncate text-xs text-conteudo-suave">
                    {item.etapaNome}
                    {item.observacao ? " · exceção anotada" : ""}
                  </span>
                </span>

                {item.semConferencia ? (
                  <span className="shrink-0 rounded-full border border-borda bg-superficie-2 px-2 py-0.5 text-xs font-medium text-conteudo-suave">
                    Sem conferência
                  </span>
                ) : (
                  <SeloVeredito veredito={item.veredito} tamanho="pequeno" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {ocultas > 0 ? (
        <p className="mt-2 text-xs text-conteudo-suave">
          + {ocultas} passagem{ocultas > 1 ? "s" : ""} anterior
          {ocultas > 1 ? "es" : ""} nesta sessão.
        </p>
      ) : null}
    </Cartao>
  );
}
