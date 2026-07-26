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
 * Quatro escolhas de estado que importam:
 *
 * - ERRO NÃO VIRA ZERO. Sem dado carregado, a tela mostra o erro e mais nada:
 *   um tile "0 divergentes" por falha de rede seria lido como linha limpa —
 *   falso OK de interface sobre uma fábrica que pode estar parada;
 * - REFETCH NÃO PISCA ESQUELETO. Com dado em mão, a atualização só esmaece o
 *   conteúdo: trocar tudo por blocos cinza a cada toque faz a tela pular e
 *   esconde justamente o número que o operador está olhando;
 * - ELA SE ATUALIZA SOZINHA a cada 5 s (é tela de telão: fica na parede, e
 *   ninguém vai tocar em "Atualizar"). Consulta de leitura pura, então o custo
 *   é um `SELECT` — nenhuma chamada de visão, nenhum crédito AWS;
 * - MAS SÓ COM A ABA VISÍVEL (`refetchIntervalInBackground: false`). Aba
 *   esquecida aberta a tarde inteira não pode ficar martelando a API de fundo.
 *   Ao voltar para a aba, `refetchOnWindowFocus` busca na hora: o operador que
 *   volta tem de ver o AGORA, não o congelado de quando ele saiu.
 *
 * O esmaecer é do refetch MANUAL, não do automático. Um pulso de opacidade a
 * cada 5 s viraria ruído, e ruído a cada 5 s é o que faz alguém tirar o painel
 * da parede. O automático é silencioso; quem conta que ele está vivo é o ponto
 * pulsante ao lado da hora, e quem conta que um número mudou é o destaque do
 * próprio tile (`ao-vivo.tsx`).
 */

import { useCallback, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { obterIndicadores } from "@/lib/api";
import { juntarClasses } from "@/lib/classes";
import { Aviso, AvisoDeErro, Botao, Cartao, Esqueleto } from "@/components/ui";
import { formatarHora } from "@/components/peca/formato";

import { PontoAoVivo } from "./ao-vivo";
import { CamposComProblema } from "./campos-com-problema";
import { DivergenciasPorEtapa } from "./divergencias-por-etapa";
import { LinhaAgora } from "./linha-agora";
import { TilesDeTotais } from "./tiles-de-totais";

/** Cadência do telão. 5 s é o intervalo em que a demo "responde" ao operador. */
const INTERVALO_MS = 5_000;

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
    // MESMA chave do `useAlertaDaLinha` do cabeçalho, de propósito: os dois
    // querem a mesma resposta, e uma chave só significa UMA requisição
    // servindo as duas telas em vez de dois pollings concorrentes.
    queryKey: ["indicadores"],
    queryFn: ({ signal }) => obterIndicadores(signal),
    refetchInterval: INTERVALO_MS,
    // Default do React Query, escrito à mão porque aqui é DECISÃO: a aba oculta
    // não recarrega nada (o `focusManager` v5 usa `visibilitychange`).
    refetchIntervalInBackground: false,
    // Com aba oculta o relógio para; ao voltar, o dado exibido é velho por
    // definição. `staleTime: 0` + refetch no foco fazem a volta ser instantânea.
    refetchOnWindowFocus: true,
    staleTime: 0,
    // Chave fixa: hoje isto é redundante (o React Query já mantém `data`
    // durante o refetch da mesma chave). Fica como cinto de segurança para o
    // dia em que a consulta ganhar parâmetro — trocar a chave sem isto faria a
    // tela cair no esqueleto, que é exatamente o que não pode acontecer num
    // painel que se recarrega sozinho.
    placeholderData: keepPreviousData,
  });

  const { refetch } = consulta;

  /**
   * Só o toque em "Atualizar" esmaece a tela. O refetch automático é mudo —
   * senão o painel piscaria a cada 5 s, e o operador aprenderia a não olhar.
   */
  const [atualizacaoManual, setAtualizacaoManual] = useState(false);

  const atualizarAgora = useCallback(() => {
    setAtualizacaoManual(true);
    void refetch().finally(() => setAtualizacaoManual(false));
  }, [refetch]);

  const esmaecendo = atualizacaoManual && consulta.isFetching;

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
            onClick={atualizarAgora}
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
        {/* SEM `aria-live` de propósito: a hora muda a cada 5 s, e uma região
            viva aqui faria o leitor de tela ler o relógio a cada 5 s. O que
            precisa ser anunciado (peça parada) tem `role="alert"` no cabeçalho.
            O ponto pulsante é `aria-hidden`: é a versão visual da MESMA
            informação que este texto já dá. */}
        <p className="flex items-center gap-2 text-xs text-conteudo-suave">
          {atualizacaoManual ? (
            "Atualizando…"
          ) : (
            <>
              <PontoAoVivo ativo={!consulta.error} />
              {atualizadoEm ? (
                <>
                  {consulta.error
                    ? "Sem atualizar desde as "
                    : "Ao vivo · atualizado às "}
                  <span className="numeros">{atualizadoEm}</span>
                </>
              ) : (
                "Ao vivo"
              )}
            </>
          )}
        </p>
        <Botao
          variante="secundario"
          onClick={atualizarAgora}
          carregando={esmaecendo}
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

      {/* O esmaecido é SÓ do refetch manual (`esmaecendo`) — ver o cabeçalho
          deste arquivo. O automático não pode piscar a tela a cada 5 s. */}
      <div
        aria-busy={esmaecendo || undefined}
        className={juntarClasses(
          "space-y-4 transition-opacity",
          esmaecendo && "opacity-60",
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
