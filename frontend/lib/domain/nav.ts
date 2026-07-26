// Itens de navegação do shell — uma fonte para sidebar (9 itens) e navbar
// inferior mobile (6 itens; Checkpoints e Configurações vão no menu do
// avatar, conforme o handoff).

import type { IconName } from "@/components/ui/icon";

export interface NavItem {
  href: string;
  label: string;
  /** Rótulo curto da navbar inferior (ex.: "Unidades", "Ao vivo"). */
  labelMobile?: string;
  icon: IconName;
  /** Presente na navbar inferior mobile. */
  mobile: boolean;
  /** Prefixos extras que marcam o item como ativo (rotas de detalhe). */
  activePrefixes?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid", mobile: true },
  {
    href: "/transformadores",
    label: "Transformadores",
    labelMobile: "Unidades",
    icon: "cube",
    mobile: true,
  },
  { href: "/lotes", label: "Lotes", icon: "layers", mobile: true },
  { href: "/projetos", label: "Projetos", icon: "folder", mobile: true },
  { href: "/clientes", label: "Clientes", icon: "users", mobile: false },
  {
    href: "/tempo-real",
    label: "Tempo real",
    labelMobile: "Ao vivo",
    icon: "activity",
    mobile: true,
  },
  { href: "/cameras", label: "Câmeras", icon: "camera", mobile: true },
  {
    href: "/checkpoints",
    label: "Checkpoints",
    icon: "nodes",
    mobile: false,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: "gear",
    mobile: false,
  },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  return (
    pathname === item.href ||
    pathname.startsWith(item.href + "/") ||
    (item.activePrefixes ?? []).some((p) => pathname.startsWith(p))
  );
}
