import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/server/auth-cookies";

// Checagem otimista apenas (sem chamar o backend nem decodificar o JWT) — a
// checagem real fica no useSession do client. Ver frontend/AUTH.md.
// `/` é resolvido aqui (e não em redirects do next.config) para o usuário
// deslogado chegar ao /login em UM hop: redirects rodam antes do proxy e
// forçariam / → /dashboard → /login.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(ACCESS_COOKIE);
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasSession ? "/dashboard" : "/login", request.url),
    );
  }

  if (pathname === "/login") {
    return hasSession
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Tudo do shell exige cookie; /estacao fica FORA de propósito (ferramenta
  // de chão de fábrica sem login, decisão do plano TRAEL Vision).
  matcher: [
    "/((?!api|_next/static|_next/image|estacao|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2)$).*)",
  ],
};
