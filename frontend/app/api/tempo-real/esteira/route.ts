import { NextRequest } from "next/server";
import { proxyBackendGet } from "@/lib/server/backend-proxy";

// GET /api/tempo-real/esteira — ocupação atual da linha (peças por
// checkpoint, posição = última passagem), o estado INICIAL da esteira de
// tempo real. Dali em diante o driver escuta o evento Socket.IO
// `passagem-registrada` e rebusca este snapshot a cada reconnect.
export async function GET(request: NextRequest) {
  return proxyBackendGet(request, "/api/v1/tempo-real/esteira");
}
