"use client";

/**
 * Tela da peça: busca por número de série, alerta do veredito vigente,
 * trânsito e conferências (T4.5 do PLAN; critério 5 do SPEC e a metade do
 * critério 6 que acontece FORA da tela de veredito).
 *
 * O termo buscado mora na URL (`/peca?numeroSerie=847233`) e não em estado
 * local: assim o link é compartilhável, o botão voltar funciona, e as outras
 * telas (conferência e scan) podem mandar o operador direto para o histórico da
 * peça que acabaram de tocar.
 *
 * Três consultas independentes, todas de LEITURA — esta tela nunca escreve
 * nada:
 *   1. `GET /transformadores?numeroSerie=` (0 ou 1: a coluna é única);
 *   2. `GET /transformadores/:id/passagens` (ASC — critério 5);
 *   3. `GET /transformadores/:id/conferencias` (DESC — a primeira é o vigente).
 */

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  buscarPecaPorNumeroSerie,
  historicoDeConferencias,
  historicoDePassagens,
} from "@/lib/api";
import { Aviso, AvisoDeErro, Botao, Carregando, Cartao } from "@/components/ui";

import { AlertaDeDivergencia } from "./alerta-de-divergencia";
import { BuscaDePeca } from "./busca-de-peca";
import { CabecalhoDaPeca } from "./cabecalho-da-peca";
import { LinhaDoTempoPassagens } from "./linha-do-tempo-passagens";
import { ListaDeConferencias } from "./lista-de-conferencias";

/** Nome do parâmetro de URL que carrega a busca. */
export const PARAMETRO_NUMERO_SERIE = "numeroSerie";

export function TelaDaPeca() {
  const parametros = useSearchParams();
  const roteador = useRouter();
  const clienteDeConsultas = useQueryClient();

  const numeroSerie = parametros.get(PARAMETRO_NUMERO_SERIE)?.trim() ?? "";

  const irPara = useCallback(
    (termo: string) => {
      const limpo = termo.trim();
      roteador.replace(
        limpo
          ? `/peca?${PARAMETRO_NUMERO_SERIE}=${encodeURIComponent(limpo)}`
          : "/peca",
        { scroll: false },
      );
    },
    [roteador],
  );

  const consultaPeca = useQuery({
    queryKey: ["peca", numeroSerie],
    queryFn: ({ signal }) => buscarPecaPorNumeroSerie(numeroSerie, signal),
    enabled: numeroSerie.length > 0,
  });

  const peca = consultaPeca.data ?? null;
  const pecaId = peca?.id ?? null;

  const consultaPassagens = useQuery({
    queryKey: ["peca", pecaId, "passagens"],
    queryFn: ({ signal }) =>
      historicoDePassagens(pecaId as string, { limit: 50 }, signal),
    enabled: pecaId !== null,
  });

  const consultaConferencias = useQuery({
    queryKey: ["peca", pecaId, "conferencias"],
    queryFn: ({ signal }) =>
      historicoDeConferencias(pecaId as string, { limit: 20 }, signal),
    enabled: pecaId !== null,
  });

  const atualizar = useCallback(() => {
    void clienteDeConsultas.invalidateQueries({ queryKey: ["peca"] });
    void clienteDeConsultas.invalidateQueries({ queryKey: ["conferencia"] });
  }, [clienteDeConsultas]);

  const conferencias = consultaConferencias.data ?? [];
  const ultimaConferencia = conferencias[0] ?? null;
  const passagens = consultaPassagens.data?.data ?? [];

  return (
    <div className="space-y-4">
      <BuscaDePeca
        // Remontar ao trocar a URL sincroniza o campo com o parâmetro sem
        // efeito nenhum (voltar no navegador reflete no que está digitado).
        key={numeroSerie}
        inicial={numeroSerie}
        ocupado={consultaPeca.isFetching}
        aoBuscar={irPara}
      />

      {!numeroSerie ? (
        <Cartao>
          <Aviso tom="neutro">
            Informe o número de série para ver o trânsito da peça na linha e as
            conferências já feitas nela.
          </Aviso>
        </Cartao>
      ) : null}

      {numeroSerie && consultaPeca.isPending ? (
        <Carregando linhas={2} rotulo="Procurando a peça…" />
      ) : null}

      {numeroSerie && consultaPeca.error ? (
        <AvisoDeErro erro={consultaPeca.error} />
      ) : null}

      {numeroSerie && !consultaPeca.isPending && !consultaPeca.error && !peca ? (
        <Cartao>
          <Aviso tom="alerta">
            Nenhuma peça cadastrada com o número de série{" "}
            <strong className="numeros">{numeroSerie}</strong>. Confira os
            dígitos na etiqueta — a peça só passa a existir no sistema no
            primeiro scan de passagem ou na primeira conferência.
          </Aviso>
        </Cartao>
      ) : null}

      {peca ? (
        <>
          <CabecalhoDaPeca peca={peca} />

          {consultaConferencias.isPending ? (
            <Carregando linhas={1} rotulo="Carregando o veredito vigente…" />
          ) : consultaConferencias.error ? (
            // Consulta que FALHOU não é peça sem conferência. Com a lista
            // vazia por erro de rede, o alerta afirmaria "esta peça ainda não
            // foi conferida" — um falso OK de interface sobre uma peça que
            // pode estar divergente. Ausência só se afirma com resposta boa.
            <Cartao>
              <Aviso tom="alerta">
                Não deu para carregar as conferências desta peça. O estado dela
                é <strong>desconhecido</strong>: isto não quer dizer que ela
                nunca foi conferida, nem que esteja aprovada.
              </Aviso>
              <AvisoDeErro
                erro={consultaConferencias.error}
                className="mt-2"
              />
              <div className="mt-3">
                <Botao
                  variante="secundario"
                  onClick={() => void consultaConferencias.refetch()}
                  carregando={consultaConferencias.isFetching}
                >
                  Tentar de novo
                </Botao>
              </div>
            </Cartao>
          ) : (
            <AlertaDeDivergencia ultima={ultimaConferencia} />
          )}

          <LinhaDoTempoPassagens
            passagens={passagens}
            carregando={consultaPassagens.isPending}
            erro={consultaPassagens.error}
            temMais={consultaPassagens.data?.hasNextPage ?? false}
          />

          <ListaDeConferencias
            conferencias={conferencias}
            carregando={consultaConferencias.isPending}
            erro={consultaConferencias.error}
          />

          <div className="flex justify-center pb-2">
            <Botao
              variante="secundario"
              onClick={atualizar}
              carregando={
                consultaPassagens.isFetching || consultaConferencias.isFetching
              }
            >
              Atualizar histórico
            </Botao>
          </div>
        </>
      ) : null}
    </div>
  );
}
