// Proxy BFF genérico de LEITURA: cookie httpOnly → Bearer → NestJS.
// O browser nunca vê o JWT (ver AUTH.md); todo handler de dado de domínio
// repassa por aqui. Status e corpo do backend passam intactos (401/404/422
// chegam ao client com o JSON de erro original).
//
// Nunca use GET /transformadores/:id do backend por aqui esperando 404: ele
// devolve 200 com corpo vazio para id inexistente (CRUD gerado). O caminho
// certo para "peça pela série" é GET /transformadores?numeroSerie=.

import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/server/backend-url";
import { ACCESS_COOKIE } from "@/lib/server/auth-cookies";

export async function proxyBackendGet(
  request: NextRequest,
  backendPath: string,
): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.toString();
  const url = `${getBackendUrl()}${backendPath}${query ? `?${query}` : ""}`;

  const backendResponse = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const body = await backendResponse.text();
  return new NextResponse(body, {
    status: backendResponse.status,
    headers: {
      "content-type":
        backendResponse.headers.get("content-type") ?? "application/json",
    },
  });
}
