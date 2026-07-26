"use client";

/**
 * A identidade ESPERADA da peça, do jeito que a API a guardou a partir do QR.
 *
 * Número de série em destaque e tabular (`numeros`): é a chave de negócio e é
 * ele que o operador compara dígito a dígito com o metal (847233 × 847833).
 * Patrimônio aparece ao lado, mas rotulado como numeração do cliente — nunca
 * como chave, para ninguém usá-lo como identificador.
 */

import type { ReactNode } from "react";

import { Cartao, Chip } from "@/components/ui";
import { juntarClasses } from "@/lib/classes";
import type { Transformador } from "@/lib/tipos";

function Dado({
  rotulo,
  children,
  numerico,
  titulo,
  className,
}: {
  rotulo: string;
  children: ReactNode;
  numerico?: boolean;
  /** Valor completo no `title` — o texto é truncado no celular. */
  titulo?: string;
  className?: string;
}) {
  return (
    <div className={juntarClasses("min-w-0", className)}>
      <dt className="text-xs font-medium tracking-wide text-conteudo-suave uppercase">
        {rotulo}
      </dt>
      <dd
        title={titulo}
        className={
          numerico
            ? "numeros truncate text-base font-semibold text-conteudo"
            : "truncate text-base text-conteudo"
        }
      >
        {children}
      </dd>
    </div>
  );
}

export function CabecalhoDaPeca({ peca }: { peca: Transformador }) {
  const projeto = peca.projetoModelo?.codigo ?? null;

  return (
    <Cartao faixa="acento">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-conteudo-suave uppercase">
            Número de série
          </p>
          <p className="numeros text-3xl leading-tight font-bold text-conteudo">
            {peca.numeroSerie}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {projeto ? (
            <Chip tom="acento" titulo="Projeto/modelo cuja checklist a peça segue">
              Projeto {projeto}
            </Chip>
          ) : (
            <Chip
              tom="alerta"
              titulo="Sem vínculo de projeto: a API resolve o modelo por fallback na hora de conferir"
            >
              Sem projeto vinculado
            </Chip>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Dado rotulo="Patrimônio (cliente)" numerico>
          {peca.patrimonio || "—"}
        </Dado>
        <Dado
          rotulo="Cliente"
          titulo={peca.cliente || undefined}
          className="col-span-2"
        >
          {peca.cliente || "—"}
        </Dado>
        {peca.pedido ? (
          <Dado rotulo="Pedido" numerico>
            {peca.pedido}
          </Dado>
        ) : null}
        {peca.seq ? (
          <Dado rotulo="Seq" numerico>
            {peca.seq}
          </Dado>
        ) : null}
      </dl>

      {peca.descricao ? (
        <p className="mt-3 border-t border-borda pt-3 text-sm text-conteudo-suave">
          {peca.descricao}
        </p>
      ) : null}
    </Cartao>
  );
}
