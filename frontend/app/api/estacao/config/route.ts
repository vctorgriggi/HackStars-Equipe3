import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ARQ_CONFIG = path.join(process.cwd(), "data", "estacao", "config.json");

export async function GET() {
  try {
    const config = JSON.parse(fs.readFileSync(ARQ_CONFIG, "utf8"));
    return NextResponse.json(config);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const config = await req.json();
    fs.mkdirSync(path.dirname(ARQ_CONFIG), { recursive: true });
    fs.writeFileSync(ARQ_CONFIG, JSON.stringify(config, null, 2));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : "erro desconhecido" },
      { status: 400 },
    );
  }
}
