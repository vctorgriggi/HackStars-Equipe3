import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/server/backend-url";

// O socket.io-client conecta do NAVEGADOR direto ao backend (WebSocket não
// atravessa o BFF), então a origem precisa chegar ao client. Servi-la por
// handler mantém `API_URL` como fonte única server-side — URL de API não é
// segredo (o CLAUDE.md proíbe SEGREDO em bundle, não endereço), mas criar um
// `NEXT_PUBLIC_*` paralelo seria um segundo mecanismo de configuração.
export async function GET() {
  return NextResponse.json({ url: getBackendUrl() });
}
