/**
 * `/indicadores` — dashboard de linha e indicadores de auditoria (Fase 5 do
 * PLAN, os Could do SPEC).
 *
 * A tela inteira mora em `components/indicadores/tela-de-indicadores.tsx`;
 * aqui fica só o título. Sem `useSearchParams` nesta página, então também sem
 * limite de Suspense: o conteúdo é um componente cliente que se vira sozinho
 * com os próprios estados de carga.
 */

import { TelaDeIndicadores } from "@/components/indicadores/tela-de-indicadores";

export default function PaginaIndicadores() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-conteudo">
          Indicadores da linha
        </h1>
        <p className="mt-1 text-sm text-conteudo-suave">
          Onde a não conformidade é acusada, quais campos mais dão problema e
          como está cada peça. Tudo já contado pela API: esta tela não recalcula
          veredito nenhum — e consultar não registra passagem nem gera
          conferência.
        </p>
      </header>

      <TelaDeIndicadores />
    </div>
  );
}
