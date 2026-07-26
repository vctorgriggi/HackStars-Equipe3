"use client";

/**
 * "Linha agora": uma entrada por peça, com ONDE ela está (última passagem) e
 * COMO ela está (último veredito) — o dashboard de linha do SPEC.
 *
 * Três honestidades que este bloco não pode perder:
 *
 * 1. a ETAPA aparece colada ao veredito. `conforme` de gate parcial atesta o
 *    recorte daquele gate, nunca a peça inteira — um selo verde sozinho seria
 *    o falso OK que a regra de ouro existe para impedir;
 * 2. peça sem conferência não é peça aprovada, e o texto diz isso;
 * 3. a lista tem teto no servidor. Quando ela é menor que o total de peças, o
 *    rodapé avisa o corte em vez de fingir que a fábrica inteira cabe aqui.
 *
 * A ordem (passagem mais recente primeiro) é a que a API devolveu.
 */

import type { ReactNode } from "react";
import Link from "next/link";

import { Aviso, CabecalhoCartao, Cartao, Chip, SeloVeredito } from "@/components/ui";
import { juntarClasses } from "@/lib/classes";
import { comoVeredito, type PecaNaLinha } from "@/lib/tipos";
import { descreverEtapa, formatarDataHora } from "@/components/peca/formato";

import { formatarInteiro } from "./formato";

function Coluna({
  rotulo,
  children,
}: {
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium tracking-wide text-conteudo-suave uppercase">
        {rotulo}
      </p>
      <div className="mt-0.5 min-w-0">{children}</div>
    </div>
  );
}

function LinhaDaPeca({ peca }: { peca: PecaNaLinha }) {
  const classe = comoVeredito(peca.ultimaConferencia?.veredito);
  const patrimonio = peca.patrimonio?.trim() ?? "";

  return (
    <li
      className={juntarClasses(
        "rounded-xl border border-borda bg-superficie p-3",
        classe === "divergente" && "border-l-4 border-l-divergente",
        classe === "nao_conferivel" && "border-l-4 border-l-nao-conferivel",
        classe === "conforme" && "border-l-4 border-l-conforme",
      )}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Coluna rotulo="Peça">
          <Link
            href={`/peca?numeroSerie=${encodeURIComponent(peca.numeroSerie)}`}
            className="numeros inline-flex min-h-8 items-center text-lg font-bold text-acento underline-offset-4 hover:underline"
            title="Abrir o histórico desta peça"
          >
            {peca.numeroSerie}
          </Link>
          <p className="text-xs text-conteudo-suave">
            {patrimonio ? (
              <>
                Patrimônio <span className="numeros">{patrimonio}</span>
              </>
            ) : (
              "A etiqueta não trazia patrimônio"
            )}
          </p>
        </Coluna>

        <Coluna rotulo="Onde está">
          {peca.ultimaPassagem ? (
            <>
              <p className="truncate text-sm font-semibold text-conteudo">
                {peca.ultimaPassagem.checkpoint.nome}
              </p>
              <p className="text-xs text-conteudo-suave">
                {formatarDataHora(peca.ultimaPassagem.em)} ·{" "}
                <code>{peca.ultimaPassagem.checkpoint.codigo}</code>
              </p>
            </>
          ) : (
            <p className="text-sm text-conteudo-suave italic">
              Ainda sem trânsito registrado
            </p>
          )}
        </Coluna>

        <Coluna rotulo="Como está">
          {peca.ultimaConferencia ? (
            <>
              <SeloVeredito
                veredito={peca.ultimaConferencia.veredito}
                tamanho="pequeno"
              />
              <p className="mt-1 truncate text-xs text-conteudo">
                {descreverEtapa(peca.ultimaConferencia.etapa)}
              </p>
              <p className="text-xs text-conteudo-suave">
                {formatarDataHora(peca.ultimaConferencia.em)}
              </p>
            </>
          ) : (
            <>
              {/* "Nunca conferida" e não "Sem veredito": o selo já usa "Sem
                  veredito" para a conferência que EXISTE sem veredito gravado,
                  e as duas situações pedem ações diferentes. */}
              <Chip titulo="Esta peça nunca passou pela engine de conferência">
                Nunca conferida
              </Chip>
              <p className="mt-1 text-xs text-conteudo-suave">
                Ausência de conferência não é peça aprovada.
              </p>
            </>
          )}
        </Coluna>
      </div>
    </li>
  );
}

export function LinhaAgora({
  linha,
  totalDePecas,
}: {
  linha: PecaNaLinha[];
  /** `totais.pecas`: conta TODAS as peças, inclusive as cortadas pelo teto. */
  totalDePecas: number;
}) {
  const cortada = linha.length < totalDePecas;

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Linha agora"
        descricao="Onde cada peça está e qual veredito está valendo nela."
        acao={
          linha.length ? (
            <Chip titulo="Peças nesta lista" className="shrink-0">
              <span className="numeros">{formatarInteiro(linha.length)}</span>
            </Chip>
          ) : null
        }
      />

      {linha.length === 0 ? (
        <Aviso tom="neutro">
          Nenhuma peça cadastrada ainda. A peça nasce no sistema no primeiro
          scan de passagem ou na primeira conferência.
        </Aviso>
      ) : (
        <>
          <ul className="space-y-2">
            {linha.map((peca) => (
              <LinhaDaPeca key={peca.transformadorId} peca={peca} />
            ))}
          </ul>

          <p className="mt-3 text-xs text-conteudo-suave">
            {cortada ? (
              <>
                Mostrando as{" "}
                <strong className="numeros">
                  {formatarInteiro(linha.length)}
                </strong>{" "}
                peças com movimento mais recente, de{" "}
                <strong className="numeros">
                  {formatarInteiro(totalDePecas)}
                </strong>{" "}
                cadastradas.{" "}
              </>
            ) : null}
            O veredito vem com a etapa em que ele saiu:{" "}
            <strong>conforme de gate parcial não atesta a peça inteira</strong>.
            Toque no número de série para abrir o histórico da peça.
          </p>
        </>
      )}
    </Cartao>
  );
}
