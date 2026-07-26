"use client";

// Sino de notificações — Base UI Popover (não Menu: o painel é lista de
// texto + UMA ação, e "Marcar todas como lidas" deve manter o painel aberto
// para o usuário ver os itens esmaecerem). Substitui o overlay fixed
// inset-0 do protótipo por dismissal correta (Esc, clique fora, foco).

import { Popover } from "@base-ui/react/popover";
import { useMarkAllRead, useNotificacoes } from "@/lib/data/use-notificacoes";
import { READING_VAR } from "@/lib/domain/status";
import { Icon } from "@/components/ui/icon";

export function NotificationBell() {
  const { data: notificacoes = [] } = useNotificacoes();
  const markAll = useMarkAllRead();
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={
          naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : "Notificações"
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface-2 text-text-2 hover:bg-surface-3 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
      >
        <Icon name="bell" size={16} />
        {naoLidas > 0 && (
          <span className="t-mono absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-reading-mismatch px-1 text-2xs text-white">
            {naoLidas}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Popover.Popup
            className="w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-lg border border-line bg-surface-1 origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            style={{
              boxShadow: "var(--shadow-pop)",
              transitionTimingFunction: "var(--ease-standard)",
            }}
          >
            <div className="flex items-center border-b border-line px-4 py-3">
              <Popover.Title className="text-sm font-semibold">
                Notificações
              </Popover.Title>
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="ml-auto text-xs text-text-3 hover:text-text-1"
              >
                Marcar todas como lidas
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {notificacoes.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start gap-2 border-b border-line px-4 py-3 last:border-b-0"
                  style={{ opacity: n.lida ? 0.55 : 1 }}
                >
                  <span
                    aria-hidden
                    className="mt-[5px] h-2 w-2 flex-none rounded-full"
                    style={{ background: READING_VAR[n.status] }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-text-1">{n.mensagem}</p>
                    <p className="t-mono mt-0.5 text-2xs text-text-3">
                      {n.quando}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
