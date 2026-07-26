"use client";

/**
 * `/peca` — busca e histórico da peça (T4.5 do PLAN).
 *
 * A tela inteira mora em `components/peca/tela-da-peca.tsx`; aqui fica só o
 * título e o limite de Suspense. O limite é obrigatório, não enfeite:
 * `useSearchParams` faz a subárvore ser renderizada no cliente, e sem
 * `<Suspense>` o Next reclama na build (a página deixaria de ser pré-renderizada
 * inteira).
 */

import { Suspense } from "react";

import { Carregando } from "@/components/ui";
import { TelaDaPeca } from "@/components/peca/tela-da-peca";

export default function PaginaPeca() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-conteudo">Buscar peça</h1>
        <p className="mt-1 text-sm text-conteudo-suave">
          Por onde a peça passou e o que já foi conferido nela. Tudo aqui é
          leitura: consultar não registra passagem nem gera veredito.
        </p>
      </div>

      <Suspense fallback={<Carregando linhas={3} rotulo="Abrindo a busca…" />}>
        <TelaDaPeca />
      </Suspense>
    </div>
  );
}
