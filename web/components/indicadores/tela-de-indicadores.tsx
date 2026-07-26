"use client";

/**
 * INDICADORES — dashboard de linha (T5.1) e indicadores de auditoria (T5.2).
 *
 * Uma consulta só, `GET /conferencias/indicadores`, e nenhuma decisão do lado
 * de cá: totais, agrupamentos por etapa e por campo e a lista de peças chegam
 * agregados e ORDENADOS pela API. A tela desenha; a API conta. É o mesmo
 * contrato das outras telas, só que aqui a tentação é maior — somar duas
 * colunas num `useMemo` pareceria inofensivo e seria a primeira regra de
 * negócio a nascer no cliente.
 *
 * Consulta de LEITURA pura: abrir esta tela não escreve nada e não gasta
 * crédito de visão (nenhuma chamada AWS acontece aqui).
 *
 * Duas escolhas de estado que importam:
 *
 * - ERRO NÃO VIRA ZERO. Sem dado carregado, a tela mostra o erro e mais nada:
 *   um tile "0 divergentes" por falha de rede seria lido como linha limpa —
 *   falso OK de interface sobre uma fábrica que pode estar parada;
 * - REFETCH NÃO PISCA ESQUELETO. Com dado em mão, a atualização só esmaece o
 *   conteúdo: trocar tudo por blocos cinza a cada toque faz a tela pular e
 *   esconde justamente o número que o operador está olhando.
 */

import { useQuery } from "@tanstack/react-query";

import { obterIndicadores } from "@/lib/api";
import { juntarClasses } from "@/lib/classes";
import { Aviso, AvisoDeErro, Botao, Cartao, Esqueleto } from "@/components/ui";
import { formatarHora } from "@/components/peca/formato";

import { CamposComProblema } from "./campos-com-problema";
import { DivergenciasPorEtapa } from "./divergencias-por-etapa";
import { LinhaAgora } from "./linha-agora";
import { TilesDeTotais } from "./tiles-de-totais";

function EsqueletoDaTela() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando indicadores…"
      className="space-y-4"
    >
      <Esqueleto className="h-52 w-full" />
      <Esqueleto className="h-64 w-full" />
      <Esqueleto className="h-64 w-full" />
      <span className="sr-only">Carregando indicadores…</span>
    </div>
  );
}

export function TelaDeIndicadores() {
  const consulta = useQuery({
    queryKey: ["indicadores"],
    queryFn: ({ signal }) => obterIndicadores(signal),
  });

  const dados = consulta.data ?? null;
  const atualizadoEm =
    dados && consulta.dataUpdatedAt > 0
      ? formatarHora(new Date(consulta.dataUpdatedAt).toISOString())
      : null;

  if (consulta.isPending) return <EsqueletoDaTela />;

  if (!dados) {
    return (
      <Cartao>
        <Aviso tom="alerta">
          Não deu para carregar os indicadores. Nenhum número é exibido enquanto
          a carga falhar: um painel zerado seria lido como linha limpa, e isso
          não é o que se sabe.
        </Aviso>
        <AvisoDeErro erro={consulta.error} className="mt-2" />
        <div className="mt-3">
          <Botao
            variante="secundario"
            onClick={() => void consulta.refetch()}
            carregando={consulta.isFetching}
          >
            Tentar de novo
          </Botao>
        </div>
      </Cartao>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-conteudo-suave">
          {consulta.isFetching ? (
            "Atualizando…"
          ) : atualizadoEm ? (
            <>
              Atualizado às <span className="numeros">{atualizadoEm}</span>
            </>
          ) : null}
        </p>
        <Botao
          variante="secundario"
          onClick={() => void consulta.refetch()}
          carregando={consulta.isFetching}
        >
          Atualizar
        </Botao>
      </div>

      {/* Dado em tela + falha na ÚLTIMA tentativa: o que está exibido é a carga
          anterior, e a tela precisa dizer a hora dela em vez de deixar o
          operador achar que está vendo o agora. */}
      {consulta.error ? (
        <Cartao>
          <Aviso tom="alerta">
            A atualização falhou. Os números abaixo são da última carga que deu
            certo{atualizadoEm ? `, às ${atualizadoEm}` : ""} — não são o estado
            de agora.
          </Aviso>
          <AvisoDeErro erro={consulta.error} className="mt-2" />
        </Cartao>
      ) : null}

      <div
        aria-busy={consulta.isFetching || undefined}
        className={juntarClasses(
          "space-y-4 transition-opacity",
          consulta.isFetching && "opacity-60",
        )}
      >
        <TilesDeTotais totais={dados.totais} />
        <DivergenciasPorEtapa porEtapa={dados.porEtapa} />
        <CamposComProblema porCampo={dados.porCampo} />
        <LinhaAgora linha={dados.linha} totalDePecas={dados.totais.pecas} />
      </div>
    </div>
  );
}
