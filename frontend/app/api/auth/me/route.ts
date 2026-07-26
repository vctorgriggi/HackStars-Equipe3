import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/server/backend-url";
import { ACCESS_COOKIE } from "@/lib/server/auth-cookies";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  const backendResponse = await fetch(`${getBackendUrl()}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!backendResponse.ok) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  const user = await backendResponse.json();
  return NextResponse.json(user);
}
