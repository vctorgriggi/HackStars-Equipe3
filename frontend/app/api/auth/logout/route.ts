import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/server/backend-url";
import { ACCESS_COOKIE, clearAuthCookies, isSameOriginRequest } from "@/lib/server/auth-cookies";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "Origem inválida" }, { status: 403 });
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    await fetch(`${getBackendUrl()}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }

  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
}
