"use client";

// Card "Selecionado" ao clicar num checkpoint: etapa, contagem e séries na
// etapa (com link ao detalhe quando a peça existe no cadastro).

import Link from "next/link";
import { useRealtime } from "@/lib/stores/realtime";
import { useTransformadores } from "@/lib/data/use-transformadores";
import { fmtKva } from "@/lib/domain/status";
import { Icon } from "@/components/ui/icon";

export function SelectedPanel({
  sel,
  nome,
  onClose,
}: {
  sel: number;
  nome: string;
  onClose: () => void;
}) {
  const series = useRealtime((s) =>
    s.unidades
      .filter((u) => u.stage === sel)
      .map((u) => u.serie)
      .join("|"),
  );
  const lista = series ? series.split("|") : [];
  const { data: transformadores = [] } = useTransformadores();
  const porSerie = new Map(transformadores.map((t) => [t.serie, t]));

  return (
    <div className="rounded-lg border border-line bg-surface-1 p-4 shadow-1">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="t-caps text-2xs text-text-3">Selecionado</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar seleção"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-3 hover:bg-surface-2 hover:text-text-1"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      <p className="text-md font-semibold text-text-1">{nome}</p>
      <p className="mt-0.5 text-xs text-text-3">
        {lista.length}{" "}
        {lista.length === 1 ? "transformador" : "transformadores"} na etapa
      </p>
      <ul className="mt-3 grid gap-1.5">
        {lista.map((serie) => {
          const t = porSerie.get(serie);
          const conteudo = (
            <>
              <span className="t-mono text-sm text-text-1">{serie}</span>
              {t && (
                <span className="truncate text-xs text-text-3">
                  {t.clienteNome} · {fmtKva(t.kva)} kVA
                </span>
              )}
            </>
          );
          return (
            <li key={serie}>
              {t ? (
                <Link
                  href={`/transformadores/${serie}`}
                  className="flex items-baseline justify-between gap-2 rounded-md border border-line bg-surface-2 px-3 py-2 hover:bg-surface-3"
                >
                  {conteudo}
                </Link>
              ) : (
                <span className="flex items-baseline justify-between gap-2 rounded-md border border-line bg-surface-2 px-3 py-2">
                  {conteudo}
                </span>
              )}
            </li>
          );
        })}
        {lista.length === 0 && (
          <li className="text-sm text-text-3">Nenhuma unidade nesta etapa.</li>
        )}
      </ul>
    </div>
  );
}
