import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Liberacao com excecao (reprova humana da leitura da IA).
//
// Quando a conferencia da estacao NAO sai `conforme`, a peca nao passa
// sozinha: o operador ve a evidencia e decide. Se ele REPROVA a leitura
// (a IA errou, a peca esta certa), esta rota registra a passagem mesmo
// assim — vinculada a conferencia reprovada e com a `observacao`
// obrigatoria que torna a excecao auditavel. Quem valida tudo isso e o
// backend (422 `excecao-sem-observacao`, `conferencia-de-outra-peca`...);
// aqui so se repassa a decisao.
//
// Entrada (JSON): { payloadQr, etapaCodigo, conferenciaId, observacao }
// Saida: { ok: true, passagem } ou { ok: false, erro, errors? } com o
// status do backend preservado (o kiosk mostra o codigo do 422).
// ---------------------------------------------------------------------------

const API_URL = process.env.ESTACAO_API_URL ?? "http://localhost:3001";
const API_EMAIL = process.env.ESTACAO_API_EMAIL ?? "admin@example.com";
const API_PASSWORD = process.env.ESTACAO_API_PASSWORD ?? "secret";

async function logar(): Promise<string> {
  const resp = await fetch(`${API_URL}/api/v1/auth/email/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: API_EMAIL, password: API_PASSWORD }),
    cache: "no-store",
  });
  if (!resp.ok) throw new Error(`login respondeu ${resp.status}`);
  const corpo = (await resp.json()) as { token?: string };
  if (!corpo.token) throw new Error("login sem token");
  return corpo.token;
}

export async function POST(req: NextRequest) {
  try {
    const { payloadQr, etapaCodigo, conferenciaId, observacao } =
      (await req.json()) as {
        payloadQr?: string;
        etapaCodigo?: string;
        conferenciaId?: string;
        observacao?: string;
      };

    if (!payloadQr?.trim() || !etapaCodigo?.trim() || !conferenciaId?.trim()) {
      return NextResponse.json(
        { ok: false, erro: "payloadQr, etapaCodigo e conferenciaId sao obrigatorios" },
        { status: 400 },
      );
    }

    const token = await logar();

    const resp = await fetch(`${API_URL}/api/v1/passagens/registrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        payloadQr: payloadQr.trim(),
        etapaCodigo: etapaCodigo.trim(),
        conferenciaId: conferenciaId.trim(),
        observacao: observacao ?? null,
      }),
      cache: "no-store",
    });

    const corpo = (await resp.json().catch(() => null)) as Record<string, unknown> | null;

    if (!resp.ok) {
      // Repassa o JSON original do backend (ex.: errors.conferenciaId =
      // 'excecao-sem-observacao') com o MESMO status — o kiosk traduz.
      return NextResponse.json(
        { ok: false, erro: `registro respondeu ${resp.status}`, ...(corpo ?? {}) },
        { status: resp.status },
      );
    }

    return NextResponse.json({ ok: true, ...(corpo ?? {}) });
  } catch (e) {
    console.error("[estacao/liberar]", (e as Error).message);
    return NextResponse.json({ ok: false, erro: (e as Error).message }, { status: 502 });
  }
}
