"use client";

// Configurações — só preferências da aplicação: 4 toggles de notificação
// (mutação otimista; o toggle vira antes do acessor resolver).

import { CONFIG_ROTULOS } from "@/lib/mock/seed/config";
import {
  useConfigNotificacoes,
  useSetConfigNotificacao,
} from "@/lib/data/use-config";
import { SectionCard } from "@/components/ui/section-card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

export default function ConfiguracoesPage() {
  const { data: config, isPending } = useConfigNotificacoes();
  const set = useSetConfigNotificacao();

  if (isPending || !config) return <SkeletonRows n={4} />;

  return (
    <SectionCard title="Notificações">
      <ul className="grid">
        {CONFIG_ROTULOS.map(({ key, nome, desc }, i) => (
          <li
            key={key}
            className={`flex items-center justify-between gap-4 py-3.5 ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-1">{nome}</p>
              <p className="mt-0.5 text-xs text-text-3">{desc}</p>
            </div>
            <ToggleSwitch
              checked={config[key]}
              onCheckedChange={(v) => set.mutate({ key, value: v })}
              label={nome}
            />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
