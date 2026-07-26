import { NextRequest } from "next/server";
import { proxyBackendGet } from "@/lib/server/backend-proxy";

// GET /api/transformadores/:id/passagens?page=&limit= — histórico de trânsito
// em ordem cronológica (ASC). 404 `transformador-inexistente` repassado.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyBackendGet(
    request,
    `/api/v1/transformadores/${encodeURIComponent(id)}/passagens`,
  );
}
