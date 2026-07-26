"use client";

/**
 * "Onde dói": as conferências agrupadas pela ETAPA em que o veredito saiu.
 *
 * A ordem é a que a API devolve — a ordem da linha, com o grupo sem checkpoint
 * ("peça inteira") fechando a lista. A tela não reordena e não escolhe um
 * campeão: ela desenha a proporção e imprime as contagens do jeito que vieram.
 */

import { Aviso, CabecalhoCartao, Cartao } from "@/components/ui";
import type { IndicadorPorEtapa } from "@/lib/tipos";
import { descreverEtapa } from "@/components/peca/formato";

import {
  BarraDeVereditos,
  ContagensDeVereditos,
  LegendaDeVereditos,
} from "./vereditos";

export function DivergenciasPorEtapa({
  porEtapa,
}: {
  porEtapa: IndicadorPorEtapa[];
}) {
  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Divergências por etapa"
        descricao="Em qual gate da linha o veredito saiu, na ordem da linha."
      />

      {porEtapa.length === 0 ? (
        <Aviso tom="neutro">
          Nenhuma conferência registrada ainda — não há o que agrupar por etapa.
        </Aviso>
      ) : (
        <>
          <LegendaDeVereditos className="mb-3" />

          <ul className="space-y-4">
            {porEtapa.map((item) => {
              const nome = descreverEtapa(item.etapa);

              return (
                <li key={item.etapa?.codigo ?? "sem-etapa"}>
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-sm font-semibold text-conteudo">
                      {nome}
                    </span>
                    <span className="text-xs text-conteudo-suave">
                      {item.etapa ? (
                        <code>{item.etapa.codigo}</code>
                      ) : (
                        "conferências disparadas sem etapa"
                      )}
                    </span>
                  </div>

                  <BarraDeVereditos item={item} rotulo={nome} />
                  <ContagensDeVereditos item={item} className="mt-1.5" />
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-xs text-conteudo-suave">
            Cada conferência é contada na etapa em que ela saiu:{" "}
            <strong>conforme de gate parcial não atesta a peça inteira</strong>.
            O grupo “Peça inteira” é o das conferências disparadas sem etapa,
            que avaliam a checklist toda — ele não é uma posição da linha.
          </p>
        </>
      )}
    </Cartao>
  );
}
