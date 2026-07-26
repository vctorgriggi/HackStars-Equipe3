import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Lista as câmeras cadastradas (GET /api/v1/cameras no backend) autenticando
// com um usuário de serviço no SERVIDOR — mesmo padrão de /api/estacao/etapas.
// Existe porque /api/cameras (a rota da tela oficial) exige o cookie de
// sessão do operador logado; esta aqui alimenta a tela escondida
// (/estacao/painel-cameras), que é ferramenta de chão de fábrica sem login,
// igual a /estacao.
// ---------------------------------------------------------------------------

const API_URL = process.env.ESTACAO_API_URL ?? process.env.API_URL ?? "http://localhost:3001";
const API_EMAIL = process.env.ESTACAO_API_EMAIL ?? "admin@example.com";
const API_PASSWORD = process.env.ESTACAO_API_PASSWORD ?? "secret";

type CameraBackend = {
  id: string;
  nome: string;
  fonteFisica: string;
  ativa: boolean;
  checkpoint: { id: string; nome: string; codigo: string } | null;
};

async function pedir(caminho: string, init?: RequestInit): Promise<unknown> {
  const resp = await fetch(`${API_URL}${caminho}`, { ...init, cache: "no-store" });
  if (!resp.ok) throw new Error(`${caminho} respondeu ${resp.status}`);
  return resp.json();
}

export async function GET() {
  try {
    const login = (await pedir("/api/v1/auth/email/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: API_EMAIL, password: API_PASSWORD }),
    })) as { token?: string };
    if (!login.token) throw new Error("login sem token");

    const resp = (await pedir("/api/v1/cameras?page=1&limit=100", {
      headers: { Authorization: `Bearer ${login.token}` },
    })) as { data?: CameraBackend[] };

    return NextResponse.json({ cameras: resp.data ?? [] });
  } catch (e) {
    console.warn("[estacao/cameras]", (e as Error).message);
    return NextResponse.json(
      { cameras: [], erro: (e as Error).message },
      { status: 502 },
    );
  }
}
