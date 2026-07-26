"use client";

/**
 * As conferências da peça, da mais RECENTE para a mais antiga — a ordem em que
 * a API devolve (`GET /transformadores/:id/conferencias`). A primeira é o
 * veredito vigente, e é ela que sustenta o alerta no topo da tela.
 *
 * Cada item abre o veredito campo a campo sob demanda (a chamada só sai no
 * toque). Nada aqui recalcula veredito: o selo é o que o banco guardou, e a
 * ETAPA viaja colada nele porque `conforme` de gate parcial não atesta a peça
 * inteira (gap 14 do CLAUDE.md).
 */

import { useState } from "react";

import {
  Aviso,
  AvisoDeErro,
  CabecalhoCartao,
  Carregando,
  Cartao,
  Chip,
  SeloVeredito,
} from "@/components/ui";
import { juntarClasses } from "@/lib/classes";
import { comoVeredito, type ConferenciaResumo } from "@/lib/tipos";

import { DetalheDaConferencia } from "./detalhe-da-conferencia";
import { descreverEtapa, formatarDataHora } from "./formato";

export interface ListaDeConferenciasProps {
  conferencias: ConferenciaResumo[];
  carregando: boolean;
  erro: unknown;
}

export function ListaDeConferencias({
  conferencias,
  carregando,
  erro,
}: ListaDeConferenciasProps) {
  const [abertaId, setAbertaId] = useState<string | null>(null);

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Conferências"
        descricao="Da mais recente para a mais antiga. A primeira é o veredito vigente."
        acao={
          conferencias.length ? (
            <Chip titulo="Conferências carregadas" className="shrink-0">
              <span className="numeros">{conferencias.length}</span>
            </Chip>
          ) : null
        }
      />

      {carregando ? (
        <Carregando linhas={2} rotulo="Carregando conferências…" />
      ) : null}

      {!carregando && erro ? <AvisoDeErro erro={erro} /> : null}

      {!carregando && !erro && conferencias.length === 0 ? (
        <Aviso tom="neutro">
          Esta peça nunca foi conferida. Abra “Conferir peça” no aparelho da
          etapa para gerar o primeiro veredito.
        </Aviso>
      ) : null}

      {!carregando && !erro && conferencias.length > 0 ? (
        <ul className="space-y-2">
          {conferencias.map((conferencia, indice) => {
            const aberta = abertaId === conferencia.id;
            const classe = comoVeredito(conferencia.vereditoGeral);
            const idPainel = `conferencia-${conferencia.id}`;

            return (
              <li
                key={conferencia.id}
                className={juntarClasses(
                  "overflow-hidden rounded-xl border",
                  classe === "divergente"
                    ? "border-divergente"
                    : "border-borda",
                )}
              >
                <button
                  type="button"
                  aria-expanded={aberta}
                  aria-controls={idPainel}
                  onClick={() => setAbertaId(aberta ? null : conferencia.id)}
                  className={juntarClasses(
                    "flex min-h-14 w-full items-center gap-3 p-3 text-left transition-colors",
                    "bg-superficie hover:bg-superficie-2",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <SeloVeredito
                        veredito={conferencia.vereditoGeral}
                        tamanho="pequeno"
                      />
                      {indice === 0 ? (
                        <Chip tom="acento" titulo="Última conferência da peça">
                          Vigente
                        </Chip>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-sm text-conteudo">
                      {descreverEtapa(conferencia.checkpoint)}
                    </span>
                    <span className="block text-xs text-conteudo-suave">
                      {formatarDataHora(conferencia.createdAt)}
                    </span>
                  </span>

                  <span
                    aria-hidden
                    className={juntarClasses(
                      "shrink-0 text-xl text-conteudo-suave transition-transform",
                      aberta && "rotate-90",
                    )}
                  >
                    ›
                  </span>
                </button>

                {aberta ? (
                  <div
                    id={idPainel}
                    className="border-t border-borda bg-fundo p-3"
                  >
                    <DetalheDaConferencia
                      conferenciaId={conferencia.id}
                      ativo={aberta}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Cartao>
  );
}
