import { NextRequest } from "next/server";
import { proxyBackendGet } from "@/lib/server/backend-proxy";

// GET /api/transformadores?page=&limit=&numeroSerie=&pedido=
// → GET {backend}/api/v1/transformadores (listagem com situação).
export async function GET(request: NextRequest) {
  return proxyBackendGet(request, "/api/v1/transformadores");
}
