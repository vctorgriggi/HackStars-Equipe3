"use client";

// Navbar inferior fixa do mobile (≤880px): 6 itens (Checkpoints e
// Configurações vivem no menu do avatar). Ícone em pill que ganha
// bg-brand-surface quando ativo; alvo mínimo 60px; safe-area.

import Link from "next/link";
import { NAV_ITEMS } from "@/lib/domain/nav";
import { Icon } from "@/components/ui/icon";
import { useNavAtivo } from "./nav-active";

function BottomItem({ item }: { item: (typeof NAV_ITEMS)[number] }) {
  const ativo = useNavAtivo(item.href);
  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-[3px] focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus-tight)] ${
        ativo ? "text-text-1" : "text-text-3"
      }`}
    >
      <span
        className={`flex rounded-[var(--radius-pill)] px-3.5 py-[3px] transition-colors duration-300 ${
          ativo ? "bg-brand-surface" : ""
        }`}
      >
        <Icon name={item.icon} size={20} />
      </span>
      <span className="text-2xs font-medium">
        {item.labelMobile ?? item.label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 flex border-t border-line bg-surface-1 shadow-3 desk:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.filter((i) => i.mobile).map((item) => (
        <BottomItem key={item.href} item={item} />
      ))}
    </nav>
  );
}
