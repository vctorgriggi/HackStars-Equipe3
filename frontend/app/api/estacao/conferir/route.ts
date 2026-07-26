import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Conferencia REAL — substitui a validacao simulada.
// Fluxo (o mesmo da pagina /demo do backend):
//   1. login demo -> JWT
//   2. POST /fotos-evidencia/upload (file + fonteFisica), uma por checagem
//   3. POST /conferencias/executar-com-fotos { payloadQr, etapaCodigo, fotoEvidenciaIds }
//      -> Textract le as fotos, a engine compara com a etiqueta (QR) e decide.
//      Quem decide o veredito e o SERVIDOR — aqui so mapeamos a resposta.
//
// Entrada (multipart/form-data):
//   payloadQr    texto da etiqueta da peca (ground truth)
//   etapaCodigo  codigo do checkpoint da estacao
//   foto:<vista> um arquivo por checagem (nome do campo carrega a fonteFisica)
//
// Saida: { ok, vereditoGeral, resultados: [{ checagemId, validacao }] }
//   validacao = { sucesso, mensagem, divergencias: [{ ponto, esperado, lido }] }
//   (mesmo contrato que a pagina da estacao ja consome)
// ---------------------------------------------------------------------------

const API_URL = process.env.ESTACAO_API_URL ?? process.env.API_URL ?? "http://localhost:3001";
const API_EMAIL = process.env.ESTACAO_API_EMAIL ?? "admin@example.com";
const API_PASSWORD = process.env.ESTACAO_API_PASSWORD ?? "secret";

type CampoExecutado = {
  campo: string;
  fonteFisica: string;
  valorEsperado: string | null;
  valorLido: string | null;
  veredito: "conforme" | "divergente" | "nao_conferivel";
  motivo?: string;
  campoDaLeitura?: string;
  confianca?: number | null;
  // URL assinada pronta (expira em 1h) — o kiosk so exibe, nunca persiste.
  fotoEvidencia?: { id: string; url: string; fonteFisica: string } | null;
  regiaoLeitura?: string | null;
};

type RespostaExecucao = {
  conferencia?: { id: string; vereditoGeral: string };
  campos?: CampoExecutado[];
  // Passagem que o GATE do backend registrou (flag + veredito conforme).
  passagemRegistrada?: { passagem: { id: string } } | null;
};

type Divergencia = { ponto: string; esperado: string; lido: string };
type Validacao = { sucesso: boolean; mensagem: string; divergencias: Divergencia[] };

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

async function subirEvidencia(token: string, vista: string, arquivo: File): Promise<string> {
  const dados = new FormData();
  dados.append("file", arquivo, `${vista}.jpg`);
  dados.append("fonteFisica", vista);
  const resp = await fetch(`${API_URL}/api/v1/fotos-evidencia/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: dados,
    cache: "no-store",
  });
  if (!resp.ok) throw new Error(`upload da vista ${vista} respondeu ${resp.status}`);
  const corpo = (await resp.json()) as { id?: string };
  if (!corpo.id) throw new Error(`upload da vista ${vista} sem id`);
  return corpo.id;
}

function mapearValidacao(campos: CampoExecutado[]): Validacao {
  const divergencias: Divergencia[] = [];
  for (const c of campos) {
    if (c.veredito === "divergente") {
      divergencias.push({
        ponto: c.campo,
        esperado: c.valorEsperado ?? "—",
        lido: c.valorLido ?? "—",
      });
    } else if (c.veredito === "nao_conferivel") {
      const extra = c.motivo === "leitura-de-outro-campo" && c.campoDaLeitura
        ? `${c.motivo}: ${c.campoDaLeitura}`
        : (c.motivo ?? "sem motivo");
      divergencias.push({
        ponto: c.campo,
        esperado: c.valorEsperado ?? "—",
        lido: `nao conferivel (${extra})`,
      });
    }
  }
  if (campos.length === 0) {
    return { sucesso: true, mensagem: "nenhum campo desta vista nesta etapa", divergencias: [] };
  }
  if (divergencias.length === 0) {
    return { sucesso: true, mensagem: "todos os pontos conferem", divergencias: [] };
  }
  const qtdDivergente = campos.filter((c) => c.veredito === "divergente").length;
  const qtdNaoConferivel = campos.filter((c) => c.veredito === "nao_conferivel").length;
  const partes = [];
  if (qtdDivergente) partes.push(`${qtdDivergente} divergencia(s)`);
  if (qtdNaoConferivel) partes.push(`${qtdNaoConferivel} nao conferivel(is)`);
  return { sucesso: false, mensagem: partes.join(" e "), divergencias };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const payloadQr = String(form.get("payloadQr") ?? "").trim();
    const etapaCodigo = String(form.get("etapaCodigo") ?? "").trim();
    if (!payloadQr) {
      return NextResponse.json({ ok: false, erro: "etiqueta (payloadQr) vazia" }, { status: 400 });
    }

    const fotos: { vista: string; arquivo: File }[] = [];
    for (const [chave, valor] of form.entries()) {
      if (chave.startsWith("foto:") && valor instanceof File) {
        fotos.push({ vista: chave.slice("foto:".length), arquivo: valor });
      }
    }
    if (fotos.length === 0) {
      return NextResponse.json({ ok: false, erro: "nenhuma foto enviada" }, { status: 400 });
    }

    const token = await logar();

    const fotoEvidenciaIds = await Promise.all(
      fotos.map((f) => subirEvidencia(token, f.vista, f.arquivo)),
    );

    const corpo: Record<string, unknown> = { payloadQr, fotoEvidenciaIds };
    if (etapaCodigo) {
      corpo.etapaCodigo = etapaCodigo;
      // GATE no servidor: veredito `conforme` ja registra a passagem pela
      // etapa (vinculada a conferencia) e o tempo real anima sozinho. Quem
      // decide segue sendo a engine — o kiosk so le `passagemRegistrada`.
      corpo.registrarPassagemSeConforme = true;
    }

    const execResp = await fetch(`${API_URL}/api/v1/conferencias/executar-com-fotos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(corpo),
      cache: "no-store",
    });
    if (!execResp.ok) {
      const detalhe = await execResp.text().catch(() => "");
      throw new Error(`conferencia respondeu ${execResp.status}: ${detalhe.slice(0, 300)}`);
    }
    const resultado = (await execResp.json()) as RespostaExecucao;
    const campos = resultado.campos ?? [];

    const resultados = fotos.map((f) => ({
      checagemId: f.vista,
      validacao: mapearValidacao(campos.filter((c) => c.fonteFisica === f.vista)),
    }));

    return NextResponse.json({
      ok: true,
      vereditoGeral: resultado.conferencia?.vereditoGeral ?? "desconhecido",
      conferenciaId: resultado.conferencia?.id ?? null,
      passagemRegistrada: Boolean(resultado.passagemRegistrada),
      // Campo a campo COMPLETO (evidencia com URL assinada + bounding box):
      // e o que o modal de decisao humana mostra ao operador. `resultados`
      // continua para compatibilidade com o resumo por checagem.
      campos,
      resultados,
    });
  } catch (e) {
    console.error("[estacao/conferir]", (e as Error).message);
    return NextResponse.json(
      { ok: false, erro: (e as Error).message },
      { status: 502 },
    );
  }
}
