import { NextRequest } from "next/server";
import { proxyBackendGet } from "@/lib/server/backend-proxy";

// GET /api/clientes?page=&limit= → listagem com contadores derivados no
// servidor (totalPecas, pecasDivergentes) — o front só renderiza.
export async function GET(request: NextRequest) {
  return proxyBackendGet(request, "/api/v1/clientes");
}
