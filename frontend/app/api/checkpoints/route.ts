import { NextRequest } from "next/server";
import { proxyBackendGet } from "@/lib/server/backend-proxy";

// GET /api/checkpoints?page=&limit= — as etapas REAIS da linha (seed do
// backend), para o filtro de etapa e a timeline prevista do detalhe. Nunca
// misturar com o mock useCheckpoints() (6 etapas fictícias × 4 reais).
export async function GET(request: NextRequest) {
  return proxyBackendGet(request, "/api/v1/checkpoints");
}
