// Shell do TRAEL Vision. Server component que NUNCA suspende (sem
// cookies()/headers()/await — um layout que aguarda cookies desabilita os
// loading.tsx abaixo dele e trava a navegação; a checagem de sessão é
// otimista no proxy.ts + useSession no client, ver AUTH.md).
// Sidebar (desktop) e BottomNav (mobile) renderizam sempre; o CSS (`desk:`)
// escolhe — matchMedia no layout piscaria desktop no SSR.

import { BottomNav } from "@/components/chrome/bottom-nav";
import { RealtimeSocketDriver } from "@/components/chrome/realtime-socket-driver";
import { Sidebar } from "@/components/chrome/sidebar";
import { Topbar } from "@/components/chrome/topbar";

export default function VisionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-stretch">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto box-border w-full max-w-[1180px] flex-1 p-4 pb-24 desk:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
      <RealtimeSocketDriver />
    </div>
  );
}
