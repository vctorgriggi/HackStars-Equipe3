"use client";

/**
 * O ALERTA GLOBAL DA LINHA — quantas peças estão paradas com divergência,
 * visível de qualquer tela do app (critério 6 do SPEC: "alerta visível FORA da
 * tela de veredito").
 *
 * ## O que este hook faz — e o que ele deliberadamente NÃO faz
 *
 * Ele conta linhas de uma lista que a API já classificou. `GET
 * /conferencias/indicadores` devolve, para cada peça, a `ultimaConferencia` com
 * o `veredito` **que a engine gravou no banco**; aqui só se pergunta quais
 * dessas strings são `divergente`. Nenhum campo é comparado, nenhum limiar é
 * aplicado, nenhum veredito é criado, alterado ou inferido — trocar essa
 * contagem por qualquer forma de "decidir se a peça está ok" seria a regra de
 * ouro quebrando no cliente (CLAUDE.md).
 *
 * Ainda assim, isto é uma agregação, e agregação é do servidor: a API hoje
 * expõe `totais.divergentes`, que conta CONFERÊNCIAS divergentes (histórico
 * inteiro, inclusive as já corrigidas por uma conferência posterior) — número
 * diferente do que o alerta precisa, que é "peças cuja ÚLTIMA conferência
 * divergiu". Enquanto a API não tiver esse contador, ele nasce daqui, como
 * LEITURA da lista pronta. Candidato natural a virar campo de
 * `GET /conferencias/indicadores` na próxima rodada.
 *
 * ## O teto da lista é parte da verdade
 *
 * `linha` tem teto no servidor (as peças com movimento mais recente). Quando ela
 * é menor que `totais.pecas`, a contagem cobre só o que a lista traz — e o hook
 * devolve `parcial: true` para que quem exibe possa dizer isso em vez de
 * afirmar um total que não tem. **Zero divergências nunca é atestado de linha
 * limpa**, e por isso o cabeçalho não desenha nada quando a contagem é zero:
 * ausência de alerta não é aprovação.
 */

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { obterIndicadores } from "@/lib/api";
import { useAutenticacao } from "@/components/providers";
import { comoVeredito } from "@/lib/tipos";

/** Cadência do cabeçalho: mais lenta que a do painel — aqui é pano de fundo. */
const INTERVALO_MS = 15_000;

export interface AlertaDaLinha {
  /** Peças cuja ÚLTIMA conferência a API marcou como `divergente`. */
  quantidade: number;
  /**
   * Número de série da primeira peça divergente da lista (a de movimento mais
   * recente). Serve para o atalho quando existe uma só; `null` fora disso.
   */
  primeiroNumeroSerie: string | null;
  /** `true` quando a lista da API veio cortada pelo teto do servidor. */
  parcial: boolean;
  /** Sem dado ainda (ou deslogado): quem exibe não deve mostrar nada. */
  indisponivel: boolean;
}

const VAZIO: AlertaDaLinha = {
  quantidade: 0,
  primeiroNumeroSerie: null,
  parcial: false,
  indisponivel: true,
};

export function useAlertaDaLinha(): AlertaDaLinha {
  const { autenticado } = useAutenticacao();

  const consulta = useQuery({
    // MESMA chave da `TelaDeIndicadores`: os dois consomem a resposta inteira,
    // e uma chave só significa uma requisição servindo as duas.
    queryKey: ["indicadores"],
    queryFn: ({ signal }) => obterIndicadores(signal),
    // Todo endpoint de domínio exige JWT. Sem sessão a chamada só produziria
    // 401 em loop — e um 401 derruba a sessão inteira no provider.
    enabled: autenticado,
    refetchInterval: INTERVALO_MS,
    // Aba oculta não consulta. O cabeçalho não é motivo para manter tráfego de
    // fundo numa aba que ninguém está olhando.
    refetchIntervalInBackground: false,
    // Coerente com o intervalo: dentro de 15 s o dado do cache serve, e uma
    // navegação entre telas não dispara chamada nova.
    staleTime: INTERVALO_MS,
  });

  const erro = consulta.error;

  // Falha de rede NÃO vira badge nem vira "linha limpa" na cara do operador —
  // vira uma linha no console para quem estiver depurando. Um cabeçalho que
  // grita a cada oscilação de rede é um cabeçalho que ninguém lê mais.
  useEffect(() => {
    if (!erro) return;
    console.warn(
      "[alerta-da-linha] não deu para ler os indicadores; o cabeçalho fica sem alerta.",
      erro,
    );
  }, [erro]);

  const dados = consulta.data;

  return useMemo<AlertaDaLinha>(() => {
    if (!dados) return VAZIO;

    const divergentes = dados.linha.filter(
      (peca) => comoVeredito(peca.ultimaConferencia?.veredito) === "divergente",
    );

    return {
      quantidade: divergentes.length,
      primeiroNumeroSerie: divergentes[0]?.numeroSerie ?? null,
      parcial: dados.linha.length < dados.totais.pecas,
      indisponivel: false,
    };
  }, [dados]);
}
