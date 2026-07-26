import { NextRequest } from "next/server";
import { proxyBackendGet } from "@/lib/server/backend-proxy";

// GET /api/conferencias/:id/campos — releitura do veredito campo a campo com
// a foto-evidência de cada valor lido (URL assinada, expira em 1h — exibir,
// nunca persistir). 404 `conferencia-inexistente` repassado.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyBackendGet(
    request,
    `/api/v1/conferencias/${encodeURIComponent(id)}/campos`,
  );
}
