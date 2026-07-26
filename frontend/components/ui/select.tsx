"use client";

// Select estilizado sobre Base UI (native <select> não estiliza no iOS).
// Usado nos filtros de listagem e no vínculo câmera→checkpoint.

import { Select as BaseSelect } from "@base-ui/react/select";
import { Icon } from "./icon";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  onValueChange,
  options,
  ariaLabel,
  className = "",
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <BaseSelect.Root
      value={value}
      onValueChange={(v) => onValueChange(v as string)}
      items={options}
    >
      <BaseSelect.Trigger
        aria-label={ariaLabel}
        className={`flex h-9 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-line bg-surface-2 px-3 text-sm text-text-1 hover:bg-surface-3 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)] ${className}`}
      >
        <BaseSelect.Value className="truncate" />
        <BaseSelect.Icon className="flex text-text-3">
          <Icon name="chevron-down" size={14} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4} className="z-50">
          <BaseSelect.Popup
            className="max-h-72 overflow-y-auto rounded-lg border border-line bg-surface-1 p-1 origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            {options.map((o) => (
              <BaseSelect.Item
                key={o.value}
                value={o.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-text-2 data-[highlighted]:bg-surface-2 data-[highlighted]:text-text-1 data-[selected]:text-text-1"
              >
                <BaseSelect.ItemIndicator className="flex text-brand-medium">
                  <Icon name="check" size={13} />
                </BaseSelect.ItemIndicator>
                <BaseSelect.ItemText className="col-start-2">
                  {o.label}
                </BaseSelect.ItemText>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
