import { NextRequest, NextResponse } from "next/server";
import { pedirCaptura, statusDe } from "./_store";

// GET  ?id=X  -> { pendente, ultimaCapturaTs } — usado tanto por quem quer
//               saber se pode clicar "Capturar" quanto pela máquina que tem
//               a câmera fisicamente (agente), que fica de olho em pendente.
// POST ?id=X  -> dispara o pedido de captura (botão "Capturar" em qualquer
//               máquina que liste a câmera).

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id ausente" }, { status: 400 });
  return NextResponse.json(statusDe(id));
}

export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });
  pedirCaptura(id);
  return NextResponse.json({ ok: true });
}
