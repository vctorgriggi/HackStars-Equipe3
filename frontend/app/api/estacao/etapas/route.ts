import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ARQ_ETAPAS = path.join(process.cwd(), "data", "estacao", "etapas.json");

export async function GET() {
  try {
    const dados = JSON.parse(fs.readFileSync(ARQ_ETAPAS, "utf8"));
    return NextResponse.json(dados);
  } catch {
    return NextResponse.json({ etapas: [] });
  }
}
