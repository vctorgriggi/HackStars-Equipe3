"use client";

/**
 * "Quais campos mais dão problema": os campos conferidos agrupados por nome.
 *
 * A ORDEM É CONTRATO DA API (divergentes desc, depois não conferíveis desc,
 * depois nome) — e é ela, não uma conta desta tela, que define os dois
 * destaques: o primeiro e o segundo item da lista que chegou. O cliente não
 * reordena, não soma e não compara os números entre si; ele lê a POSIÇÃO.
 *
 * A única leitura de valor que acontece aqui é no topo da lista, para saber
 * QUAL critério está ordenando: se o primeiro campo tem zero divergências,
 * então ninguém tem (a lista é decrescente por esse campo), e o que ordena
 * passou a ser o desempate — "campo com mais divergências" ali seria descrever
 * errado a ordenação da API.
 */

import { Aviso, CabecalhoCartao, Cartao } from "@/components/ui";
import { juntarClasses } from "@/lib/classes";
import type { IndicadorPorCampo } from "@/lib/tipos";
import { rotuloCampo } from "@/components/conferencia/rotulos";

import { detalheDoCampo } from "./formato";
import {
  BarraDeVereditos,
  ContagensDeVereditos,
  LegendaDeVereditos,
} from "./vereditos";

/** Quantos itens do topo ganham a frase-diagnóstico. */
const DESTAQUES = 2;

const FRASES = {
  divergencias: [
    "Campo com mais divergências",
    "Segundo campo com mais divergências",
  ],
  naoConferiveis: [
    "Campo que mais ficou sem afirmação",
    "Segundo campo que mais ficou sem afirmação",
  ],
} as const;

export function CamposComProblema({
  porCampo,
}: {
  porCampo: IndicadorPorCampo[];
}) {
  const topo = porCampo[0];
  const criterio =
    topo && topo.divergentes > 0 ? "divergencias" : "naoConferiveis";

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Campos que mais dão problema"
        descricao="Ordem da API: divergências primeiro, empate desfeito por leituras não afirmadas. O topo é por onde a auditoria começa."
      />

      {porCampo.length === 0 ? (
        <Aviso tom="neutro">
          Nenhum campo conferido ainda — a lista nasce das conferências já
          executadas.
        </Aviso>
      ) : (
        <>
          <LegendaDeVereditos className="mb-3" />

          <ul className="space-y-3">
            {porCampo.map((item, indice) => {
              const destacado = indice < DESTAQUES;
              const frase = destacado ? FRASES[criterio][indice] : null;
              const detalhe = detalheDoCampo(item.campo);

              return (
                <li
                  key={item.campo}
                  className={juntarClasses(
                    destacado
                      ? "rounded-xl border border-borda-forte bg-superficie-2 p-3"
                      : "px-0.5",
                  )}
                >
                  {frase ? (
                    <p className="mb-1 text-xs font-semibold tracking-wide text-conteudo-suave uppercase">
                      {indice + 1}º · {frase}
                    </p>
                  ) : null}

                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-sm font-semibold text-conteudo">
                      {rotuloCampo(item.campo)}
                      {detalhe ? (
                        <span className="font-normal text-conteudo-suave">
                          {" "}
                          · {detalhe}
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate text-xs text-conteudo-suave">
                      <code>{item.campo}</code>
                    </span>
                  </div>

                  <BarraDeVereditos item={item} rotulo={item.campo} />
                  <ContagensDeVereditos item={item} className="mt-1.5" />
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-xs text-conteudo-suave">
            Muito “não conferível” num campo costuma ser problema de{" "}
            <strong>captura</strong> (vista difícil, relevo sem corroboração), e
            não da peça — o porquê de cada veredito não é gravado nesta rodada,
            então a conferência precisa ser aberta para investigar. Campo que
            saiu da checklist de um modelo continua aparecendo enquanto houver
            histórico dele: isto é auditoria, não a checklist vigente.
          </p>
        </>
      )}
    </Cartao>
  );
}
