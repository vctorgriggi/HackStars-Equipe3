import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PASTA_CAPTURAS = path.join(process.cwd(), "capturas");

// ---------------------------------------------------------------------------
// Validação SIMULADA — substituir pela chamada ao processamento real (OCR/CV)
// mantendo o mesmo contrato de resposta: { sucesso, mensagem, divergencias[] }
// ---------------------------------------------------------------------------
const PONTOS_FAKE = [
  "numero de serie",
  "modelo",
  "tensao nominal",
  "potencia",
  "data de fabricacao",
  "logotipo",
];

type Divergencia = { ponto: string; esperado: string; lido: string };
type Validacao = { sucesso: boolean; mensagem: string; divergencias: Divergencia[] };

function validarSimulado(): Validacao {
  const sucesso = Math.random() < 0.6;
  if (sucesso) {
    return { sucesso: true, mensagem: "todos os pontos conferem", divergencias: [] };
  }
  const qtd = 1 + Math.floor(Math.random() * 3);
  const pontos = [...PONTOS_FAKE].sort(() => Math.random() - 0.5).slice(0, qtd);
  const divergencias = pontos.map((p) => ({
    ponto: p,
    esperado: "ABC-" + Math.floor(1000 + Math.random() * 9000),
    lido: "ABC-" + Math.floor(1000 + Math.random() * 9000),
  }));
  return {
    sucesso: false,
    mensagem: `${divergencias.length} divergencia(s) encontrada(s)`,
    divergencias,
  };
}

function sanitizar(valor: string | null, padrao: string): string {
  return (valor ?? padrao).replace(/[^a-zA-Z0-9\-]/g, "");
}

export async function POST(req: NextRequest) {
  const lote = sanitizar(req.nextUrl.searchParams.get("lote"), "lote-sem-id");
  const checagem = sanitizar(req.nextUrl.searchParams.get("checagem"), "checagem");

  const dados = Buffer.from(await req.arrayBuffer());
  fs.mkdirSync(PASTA_CAPTURAS, { recursive: true });
  const arquivo = `${lote}-${checagem}.jpg`;
  fs.writeFileSync(path.join(PASTA_CAPTURAS, arquivo), dados);

  // demora simulada do processamento (0.8s a 2.5s)
  const demora = 800 + Math.random() * 1700;
  await new Promise((r) => setTimeout(r, demora));

  const validacao = validarSimulado();
  return NextResponse.json({ ok: true, arquivo, validacao });
}
