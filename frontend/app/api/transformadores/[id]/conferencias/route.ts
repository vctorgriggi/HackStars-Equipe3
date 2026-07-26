import { NextRequest } from "next/server";
import { proxyBackendGet } from "@/lib/server/backend-proxy";

// GET /api/transformadores/:id/conferencias?limit= — lista SIMPLES (sem
// envelope), da mais recente para a mais antiga; a primeira é o veredito
// vigente. 404 `transformador-inexistente` repassado.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyBackendGet(
    request,
    `/api/v1/transformadores/${encodeURIComponent(id)}/conferencias`,
  );
}
