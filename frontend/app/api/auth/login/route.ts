import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/server/backend-url";
import { isSameOriginRequest, setAuthCookies } from "@/lib/server/auth-cookies";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "Origem inválida" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { message: "E-mail e senha são obrigatórios" },
      { status: 400 },
    );
  }

  const backendResponse = await fetch(`${getBackendUrl()}/api/v1/auth/email/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  if (backendResponse.status === 422) {
    const data = await backendResponse.json();
    return NextResponse.json({ errors: data.errors }, { status: 422 });
  }

  if (!backendResponse.ok) {
    return NextResponse.json({ message: "Não foi possível entrar" }, { status: 500 });
  }

  const data = await backendResponse.json();
  const response = NextResponse.json({ user: data.user });
  setAuthCookies(response, {
    token: data.token,
    refreshToken: data.refreshToken,
    tokenExpires: data.tokenExpires,
  });
  return response;
}
