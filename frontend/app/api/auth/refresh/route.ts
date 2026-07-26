import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/server/backend-url";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  isSameOriginRequest,
  setAuthCookies,
} from "@/lib/server/auth-cookies";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "Origem inválida" }, { status: 403 });
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  const backendResponse = await fetch(`${getBackendUrl()}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refreshToken}` },
  });

  if (!backendResponse.ok) {
    const response = new NextResponse(null, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const data = await backendResponse.json();
  const response = new NextResponse(null, { status: 204 });
  setAuthCookies(response, {
    token: data.token,
    refreshToken: data.refreshToken,
    tokenExpires: data.tokenExpires,
  });
  return response;
}
