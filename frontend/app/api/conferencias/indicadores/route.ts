import { NextRequest } from "next/server";
import { proxyBackendGet } from "@/lib/server/backend-proxy";

// GET /api/conferencias/indicadores → leitura agregada do que a engine já
// gravou (totais, por etapa, por campo, peças na linha) — o front só renderiza.
export async function GET(request: NextRequest) {
  return proxyBackendGet(request, "/api/v1/conferencias/indicadores");
}
