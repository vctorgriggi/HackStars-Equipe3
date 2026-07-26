"use client";

import { usePathname } from "next/navigation";

/** Ativo cobre a rota e seus detalhes (/transformadores/[serie],
 *  /checkpoints/[id]) — equivale ao agrupamento tab==='det'/'chkdet' do
 *  protótipo. */
export function useNavAtivo(href: string): boolean {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(`${href}/`);
}
