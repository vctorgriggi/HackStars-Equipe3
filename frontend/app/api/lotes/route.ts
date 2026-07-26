import { NextRequest } from "next/server";
import { proxyBackendGet } from "@/lib/server/backend-proxy";

// GET /api/lotes?page=&limit= → peças agrupadas por pedido, com contadores e
// progresso derivados no servidor — o front só renderiza.
export async function GET(request: NextRequest) {
  return proxyBackendGet(request, "/api/v1/lotes");
}
