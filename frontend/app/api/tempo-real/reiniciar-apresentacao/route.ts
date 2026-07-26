import { NextRequest } from "next/server";
import { proxyBackendWrite } from "@/lib/server/backend-proxy";

// POST /api/tempo-real/reiniciar-apresentacao — ferramenta de demo: recoloca
// a peça no primeiro checkpoint da linha (apaga o trânsito dela e registra
// uma passagem nova ali). O backend anuncia o evento `passagem-registrada`
// no Socket.IO, então TODA tela ao vivo conectada vê a peça voltar — o
// cliente não mexe em estado local depois do POST.
export async function POST(request: NextRequest) {
  return proxyBackendWrite(
    request,
    "/api/v1/passagens/reiniciar-apresentacao",
    "POST",
  );
}
