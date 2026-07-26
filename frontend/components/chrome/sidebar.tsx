"use client";

// Sidebar fixa do desktop (>880px): logo + 9 itens. Item ativo:
// bg-brand-surface + text-1; inativo text-3; hover surface-2.

import Link from "next/link";
import { NAV_ITEMS } from "@/lib/domain/nav";
import { Icon } from "@/components/ui/icon";
import { useNavAtivo } from "./nav-active";

function SidebarItem({ item }: { item: (typeof NAV_ITEMS)[number] }) {
  const ativo = useNavAtivo(item.href);
  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)] ${
        ativo
          ? "bg-brand-surface text-text-1"
          : "text-text-3 hover:bg-surface-2 hover:text-text-2"
      }`}
    >
      <Icon name={item.icon} size={19} />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-sidebar flex-none flex-col gap-1 overflow-y-auto border-r border-line bg-surface-1 p-3 desk:flex">
      <div className="mb-4 flex items-center gap-3 px-2 pt-2">
        <span
          aria-hidden
          className="h-9 w-9 flex-none rounded-md"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div>
          <div className="text-base font-bold tracking-wide">TRAEL</div>
          <div className="t-caps text-2xs text-text-3">Vision</div>
        </div>
      </div>
      <nav aria-label="Navegação principal" className="grid gap-1">
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.href} item={item} />
        ))}
      </nav>
    </aside>
  );
}
