import { NextRequest } from "next/server";
import { proxyBackendWrite } from "@/lib/server/backend-proxy";

// PATCH /api/cameras/:id → atualiza cadastro (vínculo de gate, vista, ativa,
// endpoint); `checkpoint: null` remove o vínculo.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyBackendWrite(
    request,
    `/api/v1/cameras/${encodeURIComponent(id)}`,
    "PATCH",
  );
}

// DELETE /api/cameras/:id → remove a câmera (hard delete; câmera é folha).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyBackendWrite(
    request,
    `/api/v1/cameras/${encodeURIComponent(id)}`,
    "DELETE",
  );
}
