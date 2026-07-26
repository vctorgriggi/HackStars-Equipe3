import { NextRequest, NextResponse } from "next/server";
import { guardarResultado, pegarFoto } from "../_store";

// GET  ?id=X  -> devolve a última foto capturada (JPEG) para essa câmera.
// POST ?id=X  -> a máquina que tem a câmera plugada (agente) envia o frame
//               capturado; isso também limpa o "pendente".

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id ausente" }, { status: 400 });
  const foto = pegarFoto(id);
  if (!foto) {
    return NextResponse.json({ erro: "nenhuma captura ainda" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(foto), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ ok: false, erro: "corpo vazio" }, { status: 400 });
  }
  guardarResultado(id, bytes);
  return NextResponse.json({ ok: true });
}
