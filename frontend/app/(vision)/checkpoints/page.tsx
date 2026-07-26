"use client";

// Lista de checkpoints: badge de ordem, nome + câmeras (mono), chips dos
// campos validados, limiar %, toggle ativo (linha inativa: opacity .5).
// Linha clicável → detalhe; toggle não navega (stopPropagation via elemento
// irmão do Link, não filho).

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCheckpoints,
  useCreateCheckpoint,
  useUpdateCheckpoint,
} from "@/lib/data/use-checkpoints";
import { NeutralChip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { SkeletonRows } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

export default function CheckpointsPage() {
  const { data: checkpoints, isPending } = useCheckpoints();
  const update = useUpdateCheckpoint();
  const create = useCreateCheckpoint();
  const router = useRouter();

  if (isPending) return <SkeletonRows n={6} />;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-text-3">
          Etapas da esteira — edições refletem no mapa, no funil, nos filtros
          e na linha do tempo.
        </p>
        <button
          type="button"
          onClick={() =>
            create.mutate(undefined, {
              onSuccess: (novo) => router.push(`/checkpoints/${novo.id}`),
            })
          }
          className="flex h-10 flex-none items-center gap-1.5 rounded-md bg-brand-primary px-4 text-sm font-semibold text-brand-on hover:bg-brand-primary-600 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
        >
          <Icon name="plus" size={15} /> Nova etapa
        </button>
      </div>

      <ul className="grid gap-2">
        {(checkpoints ?? []).map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-3 rounded-lg border border-line bg-surface-1 px-4 py-3 shadow-1 transition-opacity"
            style={{ opacity: c.ativo ? 1 : 0.5 }}
          >
            <Link
              href={`/checkpoints/${c.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus-tight)]"
            >
              <span className="t-mono flex h-8 w-8 flex-none items-center justify-center rounded-md bg-surface-2 text-xs font-semibold text-text-2">
                {String(c.ordem).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text-1">
                  {c.nome}
                </span>
                <span className="t-mono block truncate text-xs text-text-3">
                  {c.cameraIds.length > 0
                    ? c.cameraIds.join(" · ")
                    : "sem câmera"}
                </span>
              </span>
              <span className="hidden flex-wrap gap-1.5 sm:flex">
                {c.campos.map((campo) => (
                  <NeutralChip key={campo}>{campo}</NeutralChip>
                ))}
              </span>
              <span className="t-mono flex-none text-sm text-text-2">
                {c.limiar}%
              </span>
            </Link>
            <ToggleSwitch
              checked={c.ativo}
              onCheckedChange={(v) =>
                update.mutate({ id: c.id, patch: { ativo: v } })
              }
              label={`${c.nome} ${c.ativo ? "ativa" : "inativa"}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
