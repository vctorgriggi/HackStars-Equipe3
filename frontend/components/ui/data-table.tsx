// Listagem responsiva: grid-tabela no desktop, cards no mobile — os DOIS
// renderizam sempre e o CSS (desk:) escolhe (matchMedia/useMediaQuery no SSR
// pisca a versão desktop no celular). renderCard é OBRIGATÓRIO: os cards das
// 4 listagens não são projeção das colunas (avatar, barra de progresso…),
// então a abstração genérica cobre só o lado tabular.

import type { ReactNode } from "react";
import Link from "next/link";

export interface Column<T> {
  id: string;
  header: string;
  /** trecho do grid-template-columns: "105px" | "minmax(160px,1fr)" | "1fr" */
  width: string;
  cell: (item: T) => ReactNode;
  /** chips não devem esticar na célula */
  alignStart?: boolean;
  /** ellipsis no wrapper da célula (com min-w-0, senão o track não encolhe) */
  truncate?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  rowHref,
  renderCard,
  empty,
  label,
}: {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (item: T) => string;
  /** linha vira <Link> (prefetch, middle-click); sem isto é estática */
  rowHref?: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  empty?: ReactNode;
  label: string;
}) {
  if (rows.length === 0) return <>{empty ?? null}</>;

  const template = columns.map((c) => c.width).join(" ");
  const rowClass =
    "grid w-full items-center gap-3 border-b border-line px-4 py-2 text-left min-h-row last:border-b-0 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus-tight)]";

  return (
    <>
      {/* desktop */}
      <div
        role="table"
        aria-label={label}
        className="hidden overflow-hidden rounded-lg border border-line bg-surface-1 shadow-1 desk:block"
      >
        <div
          role="row"
          className="t-caps grid gap-3 border-b border-line px-4 py-3 text-2xs text-text-3"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c) => (
            <span role="columnheader" key={c.id}>
              {c.header}
            </span>
          ))}
        </div>
        {rows.map((item) => {
          const cells = columns.map((c) => (
            <span
              role="cell"
              key={c.id}
              className={[
                c.alignStart ? "justify-self-start" : "",
                c.truncate
                  ? "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                  : "",
              ].join(" ")}
            >
              {c.cell(item)}
            </span>
          ));
          return rowHref ? (
            <Link
              role="row"
              key={rowKey(item)}
              href={rowHref(item)}
              className={`${rowClass} transition-colors hover:bg-surface-2`}
              style={{ gridTemplateColumns: template }}
            >
              {cells}
            </Link>
          ) : (
            <div
              role="row"
              key={rowKey(item)}
              className={rowClass}
              style={{ gridTemplateColumns: template }}
            >
              {cells}
            </div>
          );
        })}
      </div>

      {/* mobile */}
      <ul className="grid gap-2 desk:hidden">
        {rows.map((item) => (
          <li key={rowKey(item)}>
            {rowHref ? (
              <Link
                href={rowHref(item)}
                className="block rounded-lg border border-line bg-surface-1 px-4 py-3 shadow-1 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus-tight)]"
              >
                {renderCard(item)}
              </Link>
            ) : (
              <div className="rounded-lg border border-line bg-surface-1 px-4 py-3 shadow-1">
                {renderCard(item)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
