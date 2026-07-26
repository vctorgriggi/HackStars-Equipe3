"use client";

// Menu do avatar — Base UI Menu (cada linha É um comando: role="menu",
// setas, typeahead, fecha ao ativar). LinkItem + render={<Link/>} dá âncora
// real (prefetch, middle-click) em vez do <div onClick> do protótipo.
// Checkpoints e Configurações moram aqui no mobile (fora da navbar de 6).

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { useSession } from "@/lib/auth/use-session";
import { useLogout } from "@/lib/auth/use-logout";
import { useTheme } from "@/lib/stores/theme";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";

const ITEM =
  "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-2 data-[highlighted]:bg-surface-2 data-[highlighted]:text-text-1 focus-visible:outline-none";

export function AvatarMenu() {
  const { data: user } = useSession();
  const logout = useLogout();
  const toggleTema = useTheme((s) => s.toggle);

  const nome =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Administrador";
  const iniciais =
    nome
      .split(" ")
      .map((p) => p[0])
      .join("")
      .replace(/[^A-Za-zÀ-ú]/g, "")
      .slice(0, 2)
      .toUpperCase() || "AD";
  const cargo = user?.role?.name ?? "Operação";

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Menu da conta — ${nome}`}
        className="rounded-full focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
      >
        <Avatar iniciais={iniciais} size={34} />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Menu.Popup
            className="grid w-56 gap-0.5 rounded-lg border border-line bg-surface-1 p-2 origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            style={{
              boxShadow: "var(--shadow-pop)",
              transitionTimingFunction: "var(--ease-standard)",
            }}
          >
            <div className="mb-1 border-b border-line px-3 pb-3 pt-2">
              <span className="block text-sm font-semibold text-text-1">
                {nome}
              </span>
              <span className="block text-xs text-text-3">{cargo}</span>
            </div>

            <Menu.Item className={ITEM}>
              <Icon name="user" size={16} /> Meu perfil
            </Menu.Item>
            <Menu.LinkItem render={<Link href="/checkpoints" />} className={ITEM}>
              <Icon name="nodes" size={16} /> Checkpoints
            </Menu.LinkItem>
            <Menu.LinkItem
              render={<Link href="/configuracoes" />}
              className={ITEM}
            >
              <Icon name="gear" size={16} /> Configurações
            </Menu.LinkItem>
            <Menu.Item onClick={toggleTema} className={ITEM}>
              <Icon name="theme" size={16} /> Alternar tema
            </Menu.Item>

            <Menu.Separator className="my-1 h-px bg-line" />

            <Menu.Item
              onClick={() => logout.mutate()}
              className={`${ITEM} text-reading-mismatch data-[highlighted]:bg-reading-mismatch-soft data-[highlighted]:text-reading-mismatch`}
            >
              <Icon name="logout" size={16} /> Sair
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
