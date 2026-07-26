"use client";

// Topbar sticky 52px: título da tela + sino + toggle de tema + avatar.
// Títulos = mapa do protótipo (det → "Transformador", chkdet → "Checkpoint").

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/domain/nav";
import { AvatarMenu } from "./avatar-menu";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

function tituloDaRota(pathname: string): string {
  if (/^\/transformadores\/./.test(pathname)) return "Transformador";
  if (/^\/checkpoints\/./.test(pathname)) return "Checkpoint";
  if (pathname.startsWith("/cameras")) return "Câmeras ao vivo";
  const item = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
  );
  return item?.label ?? "TRAEL Vision";
}

export function Topbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 flex h-topbar items-center gap-2 border-b border-line bg-bg-canvas/90 px-4 backdrop-blur">
      <h1 className="min-w-0 truncate text-lg font-semibold">
        {tituloDaRota(pathname)}
      </h1>
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <AvatarMenu />
      </div>
    </header>
  );
}
