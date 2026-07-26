import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Etapas da estacao derivadas do backend real (mesma regra da pagina /demo):
//   - GET /api/v1/checkpoints        -> etapas { codigo, nome, ordem }
//   - GET /api/v1/projetos-modelo    -> exatamente 1 projeto; checklist JSON de
//                                       itens { campo, fonteFisica, obrigatorio, etapa }
//   - Cada vista (fonteFisica) passa a existir na etapa de MENOR ordem em que
//     aparece na checklist; item sem etapa valida vale para todas ("sempre").
//   - A conferencia e CUMULATIVA: a etapa X pede toda vista cuja primeira
//     etapa tem ordem <= ordem de X.
// As "checagens" da estacao sao as vistas exigidas na etapa (1 camera por vista).
//
// Cache em memoria com TTL: recalcula periodicamente para captar mudancas de
// etapa/checklist. Backend fora do ar -> serve o ultimo resultado bom;
// sem nada em cache -> fallback para data/estacao/etapas.json.
// ---------------------------------------------------------------------------

const API_URL = process.env.ESTACAO_API_URL ?? process.env.API_URL ?? "http://localhost:3001";
const API_EMAIL = process.env.ESTACAO_API_EMAIL ?? "admin@example.com";
const API_PASSWORD = process.env.ESTACAO_API_PASSWORD ?? "secret";
const TTL_MS = Number(process.env.ESTACAO_ETAPAS_TTL_MS ?? 60_000);

const ARQ_ETAPAS_FALLBACK = path.join(process.cwd(), "data", "estacao", "etapas.json");

type Checagem = { id: string; nome: string };
type Etapa = { id: string; nome: string; checagens: Checagem[] };
type Catalogo = { etapas: Etapa[]; origem: "backend" | "cache" | "arquivo" };

let cache: { catalogo: Catalogo; em: number } | null = null;

type ItemChecklist = { campo?: string; fonteFisica?: string; etapa?: string };
type CheckpointApi = { codigo?: string; nome?: string; ordem?: number };

async function pedir(caminho: string, init?: RequestInit): Promise<unknown> {
  const resp = await fetch(`${API_URL}${caminho}`, { ...init, cache: "no-store" });
  if (!resp.ok) throw new Error(`${caminho} respondeu ${resp.status}`);
  return resp.json();
}

async function derivarDoBackend(): Promise<Etapa[]> {
  const login = (await pedir("/api/v1/auth/email/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: API_EMAIL, password: API_PASSWORD }),
  })) as { token?: string };
  if (!login.token) throw new Error("login sem token");
  const auth = { Authorization: `Bearer ${login.token}` };

  const [pontosResp, projetosResp] = await Promise.all([
    pedir("/api/v1/checkpoints?page=1&limit=50", { headers: auth }) as Promise<{
      data?: CheckpointApi[];
    }>,
    pedir("/api/v1/projetos-modelo?page=1&limit=50", { headers: auth }) as Promise<{
      data?: { checklist?: string }[];
    }>,
  ]);

  const pontos = (pontosResp.data ?? []).filter(
    (p): p is Required<CheckpointApi> =>
      typeof p?.codigo === "string" && typeof p?.ordem === "number",
  );
  if (pontos.length === 0) throw new Error("nenhum checkpoint cadastrado");

  const projetos = projetosResp.data ?? [];
  if (projetos.length !== 1) {
    // mesma regra do demo: com 0 ou 2+ projetos o recorte e indeterminado
    throw new Error(`${projetos.length} projeto(s) cadastrado(s) — recorte indeterminado`);
  }
  const itens: ItemChecklist[] = JSON.parse(projetos[0].checklist ?? "[]");
  if (!itens.length) throw new Error("checklist vazia");

  const ordens = new Map<string, number>(pontos.map((p) => [p.codigo, p.ordem]));

  // primeira etapa (menor ordem) em que cada vista aparece; sem etapa valida = sempre
  const primeiraOrdem = new Map<string, number>();
  const sempre = new Set<string>();
  for (const item of itens) {
    if (typeof item?.fonteFisica !== "string") continue;
    const vista = item.fonteFisica;
    const etapa = typeof item.etapa === "string" ? item.etapa.trim() : "";
    const ordem = etapa ? ordens.get(etapa) : undefined;
    if (ordem === undefined) {
      sempre.add(vista);
    } else {
      const atual = primeiraOrdem.get(vista);
      if (atual === undefined || ordem < atual) primeiraOrdem.set(vista, ordem);
    }
  }

  const vistas = [...new Set([...sempre, ...primeiraOrdem.keys()])];

  return pontos
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => ({
      id: p.codigo,
      nome: p.nome || p.codigo,
      checagens: vistas
        .filter((v) => sempre.has(v) || (primeiraOrdem.get(v) ?? Infinity) <= p.ordem)
        .sort()
        .map((v) => ({ id: v, nome: v })),
    }))
    .filter((e) => e.checagens.length > 0);
}

function lerFallbackArquivo(): Etapa[] {
  try {
    const dados = JSON.parse(fs.readFileSync(ARQ_ETAPAS_FALLBACK, "utf8"));
    return dados.etapas ?? [];
  } catch {
    return [];
  }
}

export async function GET() {
  const agora = Date.now();
  if (cache && agora - cache.em < TTL_MS) {
    return NextResponse.json(cache.catalogo);
  }
  try {
    const etapas = await derivarDoBackend();
    const catalogo: Catalogo = { etapas, origem: "backend" };
    cache = { catalogo, em: agora };
    return NextResponse.json(catalogo);
  } catch (e) {
    console.warn("[estacao/etapas] backend indisponivel:", (e as Error).message);
    if (cache) {
      // serve o ultimo resultado bom sem renovar o TTL (tenta o backend de novo na proxima)
      return NextResponse.json({ ...cache.catalogo, origem: "cache" as const });
    }
    return NextResponse.json({ etapas: lerFallbackArquivo(), origem: "arquivo" as const });
  }
}
