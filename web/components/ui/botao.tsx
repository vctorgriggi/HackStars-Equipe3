"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

import { juntarClasses } from "@/lib/classes";

export type VarianteBotao = "primario" | "secundario" | "perigo" | "fantasma";
export type TamanhoBotao = "medio" | "grande";

/**
 * Botão do chão de fábrica.
 *
 * Alvo de toque mínimo de 48px em QUALQUER variante (`min-h-12`): a tela é
 * usada em pé, com luva, segurando a peça — botão pequeno vira toque errado, e
 * toque errado aqui dispara chamada paga de visão.
 */
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold " +
  "transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50 " +
  "active:translate-y-px";

const VARIANTES: Record<VarianteBotao, string> = {
  primario:
    "bg-acento text-acento-contraste hover:bg-acento-forte shadow-cartao",
  secundario:
    "bg-superficie text-conteudo border border-borda-forte hover:bg-superficie-2",
  // `text-superficie` e nao `text-white`: no tema escuro `--divergente` e um
  // salmao claro (#ff9d94) e texto branco em cima dele da ~2:1 de contraste —
  // reprovado, justo no botao que reconhece o alerta de divergencia. A
  // superficie inverte junto com o tema (branco no claro, quase preto no
  // escuro) e mantem >=8:1 nos dois.
  perigo: "bg-divergente text-superficie hover:brightness-110 shadow-cartao",
  fantasma: "bg-transparent text-conteudo-suave hover:bg-superficie-2",
};

const TAMANHOS: Record<TamanhoBotao, string> = {
  medio: "min-h-12 px-4 text-base",
  grande: "min-h-14 px-5 text-lg w-full",
};

function classesDoBotao(
  variante: VarianteBotao,
  tamanho: TamanhoBotao,
  extra?: string,
): string {
  return juntarClasses(BASE, VARIANTES[variante], TAMANHOS[tamanho], extra);
}

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  /** Desabilita e troca o rótulo por um indicador — sem mudar o tamanho. */
  carregando?: boolean;
  children: ReactNode;
}

export function Botao({
  variante = "primario",
  tamanho = "medio",
  carregando = false,
  className,
  children,
  disabled,
  ...resto
}: BotaoProps) {
  return (
    <button
      {...resto}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={classesDoBotao(variante, tamanho, className)}
    >
      {carregando ? (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}

export interface BotaoLinkProps {
  href: string;
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  className?: string;
  children: ReactNode;
}

/** Mesma aparência do `Botao`, mas navega (usa o `Link` do Next). */
export function BotaoLink({
  href,
  variante = "primario",
  tamanho = "medio",
  className,
  children,
}: BotaoLinkProps) {
  return (
    <Link href={href} className={classesDoBotao(variante, tamanho, className)}>
      {children}
    </Link>
  );
}
