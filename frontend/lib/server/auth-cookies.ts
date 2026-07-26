import type { NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE = "trael_at";
export const REFRESH_COOKIE = "trael_rt";

// Teto próprio do cookie, independente da validade real do refresh token no
// backend (3650d em dev) — a política do cookie não deve ser lida como
// "quanto tempo o token dura". Ver frontend/AUTH.md.
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export interface AuthTokens {
  token: string;
  refreshToken: string;
  tokenExpires: number;
}

export function setAuthCookies(response: NextResponse, tokens: AuthTokens): void {
  const accessMaxAge = Math.max(0, Math.floor((tokens.tokenExpires - Date.now()) / 1000));
  response.cookies.set(ACCESS_COOKIE, tokens.token, {
    ...baseCookieOptions,
    maxAge: accessMaxAge,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", { ...baseCookieOptions, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...baseCookieOptions, maxAge: 0 });
}

// Mitigação de CSRF em login (sameSite=lax não bloqueia Set-Cookie de
// resposta a um POST cross-site) — não é um token dedicado, só confere que a
// origem que chamou é a do próprio app. Ver frontend/AUTH.md.
export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === request.nextUrl.origin;
}
