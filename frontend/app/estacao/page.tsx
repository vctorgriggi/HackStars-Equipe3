"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type Checagem = { id: string; nome: string };
type Etapa = { id: string; nome: string; checagens: Checagem[] };
type Config = { etapaId: string; mapeamento: Record<string, string> }; // checagemId -> deviceId
type Divergencia = { ponto: string; esperado: string; lido: string };
type Validacao = { sucesso: boolean; mensagem: string; divergencias: Divergencia[] };
type ResultadoChecagem = { checagem: Checagem; validacao: Validacao };
type Dispositivo = { deviceId: string; label: string };

type Tela = "carregando" | "configuracao" | "operacao";

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function EstacaoPage() {
  const [tela, setTela] = useState<Tela>("carregando");
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [config, setConfig] = useState<Config | null>(null);

  // configuração
  const [etapaSelId, setEtapaSelId] = useState("");
  const [atribuicoes, setAtribuicoes] = useState<Record<string, string>>({}); // deviceId -> checagemId
  const [aviso, setAviso] = useState("");

  // operação
  const [camsAbertas, setCamsAbertas] = useState<Checagem[]>([]);
  const [statusOp, setStatusOp] = useState("");
  const [processando, setProcessando] = useState(false);

  // relatório
  const [relatorio, setRelatorio] = useState<ResultadoChecagem[] | null>(null);

  // streams vivem fora do ciclo de render
  const streamsPreviewRef = useRef<Map<string, MediaStream>>(new Map()); // deviceId -> stream
  const streamsOpRef = useRef<Map<string, MediaStream>>(new Map()); // checagemId -> stream
  const videosOpRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const etapaSel = etapas.find((e) => e.id === etapaSelId) ?? null;
  const etapaOp = config ? (etapas.find((e) => e.id === config.etapaId) ?? null) : null;
  const loteAprovado = relatorio !== null && relatorio.every((r) => r.validacao.sucesso);

  // -------------------------------------------------------------------------
  // Gestão de streams
  // -------------------------------------------------------------------------
  const pararPreviews = useCallback(() => {
    for (const s of streamsPreviewRef.current.values()) s.getTracks().forEach((t) => t.stop());
    streamsPreviewRef.current.clear();
  }, []);

  const pararOperacao = useCallback(() => {
    for (const s of streamsOpRef.current.values()) s.getTracks().forEach((t) => t.stop());
    streamsOpRef.current.clear();
    videosOpRef.current.clear();
    setCamsAbertas([]);
  }, []);

  useEffect(() => {
    return () => {
      pararPreviews();
      pararOperacao();
    };
  }, [pararPreviews, pararOperacao]);

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
        tmp.getTracks().forEach((t) => t.stop());
      } catch (e) {
        if (!cancelado) setAviso("Permissao de camera negada: " + (e as Error).message);
      }
      const disps = (await navigator.mediaDevices.enumerateDevices())
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      const etapasResp: { etapas: Etapa[] } = await (await fetch("/api/estacao/etapas")).json();
      const configResp: Config | null = await (await fetch("/api/estacao/config")).json();
      if (cancelado) return;

      setDispositivos(disps);
      setEtapas(etapasResp.etapas);
      setConfig(configResp);

      if (configResp && configResp.etapaId) {
        setTela("operacao");
      } else {
        setEtapaSelId(etapasResp.etapas[0]?.id ?? "");
        setTela("configuracao");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Configuração: previews + atribuições
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (tela !== "configuracao") return;
    let cancelado = false;
    (async () => {
      for (const d of dispositivos) {
        if (streamsPreviewRef.current.has(d.deviceId)) continue;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: d.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } },
          });
          if (cancelado) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamsPreviewRef.current.set(d.deviceId, stream);
          const el = document.getElementById(`preview-${d.deviceId}`) as HTMLVideoElement | null;
          if (el) el.srcObject = stream;
        } catch {
          /* dispositivo pode ter sido removido; card fica sem video */
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [tela, dispositivos]);

  // pré-carrega atribuições a partir da config salva
  useEffect(() => {
    if (tela !== "configuracao" || !config || config.etapaId !== etapaSelId) return;
    const inversa: Record<string, string> = {};
    for (const [checagemId, deviceId] of Object.entries(config.mapeamento)) {
      inversa[deviceId] = checagemId;
    }
    setAtribuicoes(inversa);
  }, [tela, config, etapaSelId]);

  useEffect(() => {
    if (tela !== "configuracao" || !etapaSel) return;
    if (dispositivos.length < etapaSel.checagens.length) {
      setAviso(
        `Atencao: esta etapa tem ${etapaSel.checagens.length} checagens, mas ha apenas ` +
          `${dispositivos.length} camera(s) conectada(s). Conecte mais cameras e recarregue (F5).`,
      );
    } else {
      setAviso("");
    }
  }, [tela, etapaSel, dispositivos]);

  async function salvarConfiguracao() {
    if (!etapaSel) return;
    const mapeamento: Record<string, string> = {};
    const usadas = new Set<string>();
    let repetido = false;
    for (const [deviceId, checagemId] of Object.entries(atribuicoes)) {
      if (!checagemId) continue;
      if (usadas.has(checagemId)) repetido = true;
      usadas.add(checagemId);
      mapeamento[checagemId] = deviceId;
    }
    if (repetido) {
      setAviso("Duas cameras estao na mesma checagem — cada checagem aceita apenas uma camera.");
      return;
    }
    const faltando = etapaSel.checagens.filter((c) => !mapeamento[c.id]);
    if (faltando.length > 0) {
      setAviso(
        "Toda checagem precisa de uma camera. Sem camera: " +
          faltando.map((c) => c.nome).join(", ") +
          ".",
      );
      return;
    }
    const nova: Config = { etapaId: etapaSel.id, mapeamento };
    await fetch("/api/estacao/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nova),
    });
    setConfig(nova);
    pararPreviews();
    setTela("operacao");
  }

  // -------------------------------------------------------------------------
  // Operação: abre as câmeras configuradas em resolução cheia
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (tela !== "operacao" || !config || !etapaOp) return;
    let cancelado = false;
    setStatusOp("Abrindo cameras...");
    (async () => {
      const abertas: Checagem[] = [];
      for (const c of etapaOp.checagens) {
        const deviceId = config.mapeamento[c.id];
        if (!deviceId) continue;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          });
          if (cancelado) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamsOpRef.current.set(c.id, stream);
          abertas.push(c);
        } catch {
          /* falha desta camera é tratada pelo aviso abaixo */
        }
      }
      if (cancelado) return;
      setCamsAbertas(abertas);
      if (abertas.length < etapaOp.checagens.length) {
        setStatusOp(
          `Apenas ${abertas.length}/${etapaOp.checagens.length} camera(s) abriram. ` +
            "Verifique conexoes e reconfigure.",
        );
      } else {
        setStatusOp(`${abertas.length} checagem(ns) prontas. Enter captura o lote.`);
      }
    })();
    return () => {
      cancelado = true;
      pararOperacao();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tela, config]);

  const prontoParaCapturar =
    tela === "operacao" &&
    !processando &&
    etapaOp !== null &&
    camsAbertas.length === etapaOp.checagens.length &&
    camsAbertas.length > 0;

  // -------------------------------------------------------------------------
  // Captura do lote
  // -------------------------------------------------------------------------
  const capturarLote = useCallback(async () => {
    if (!prontoParaCapturar) return;
    setProcessando(true);
    const lote = "lote-" + new Date().toISOString().replace(/[:.]/g, "-");

    const promessas = camsAbertas.map(async (checagem): Promise<ResultadoChecagem> => {
      try {
        const video = videosOpRef.current.get(checagem.id);
        if (!video) throw new Error("video da checagem nao encontrado");
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
        if (!blob) throw new Error("falha ao gerar imagem");

        const resp = await fetch(
          `/api/estacao/capturas?lote=${lote}&checagem=${checagem.id}`,
          { method: "POST", body: blob, headers: { "Content-Type": "image/jpeg" } },
        );
        const json: { validacao: Validacao } = await resp.json();
        return { checagem, validacao: json.validacao };
      } catch (e) {
        return {
          checagem,
          validacao: {
            sucesso: false,
            mensagem: "falha no envio: " + (e as Error).message,
            divergencias: [],
          },
        };
      }
    });

    const resultados = await Promise.all(promessas);
    setProcessando(false);
    setRelatorio(resultados);
    const oks = resultados.filter((r) => r.validacao.sucesso).length;
    setStatusOp(`Ultimo lote: ${oks}/${resultados.length} checagem(ns) OK.`);
  }, [prontoParaCapturar, camsAbertas]);

  // -------------------------------------------------------------------------
  // Teclado: Enter captura / Enter fecha relatório aprovado / Esc fecha
  // -------------------------------------------------------------------------
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setRelatorio(null);
        return;
      }
      if (e.key !== "Enter") return;
      if (relatorio !== null) {
        if (loteAprovado) setRelatorio(null);
        return;
      }
      capturarLote();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [relatorio, loteAprovado, capturarLote]);

  function reconfigurar() {
    pararOperacao();
    setRelatorio(null);
    setEtapaSelId(config?.etapaId ?? etapas[0]?.id ?? "");
    setTela("configuracao");
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      {/* topo */}
      <header className="flex items-center gap-4 bg-neutral-900 px-4 py-3">
        <h1 className="text-lg font-semibold">Estacao de captura</h1>
        <span className="text-sm text-neutral-400">
          {tela === "operacao" ? (etapaOp?.nome ?? "") : "Configuracao"}
        </span>
        <span className="flex-1" />
        {tela === "operacao" && (
          <button
            onClick={reconfigurar}
            className="rounded-lg bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600"
          >
            Reconfigurar
          </button>
        )}
      </header>

      {tela === "carregando" && (
        <div className="flex flex-1 items-center justify-center text-neutral-400">
          Carregando...
        </div>
      )}

      {/* ------------------------- tela de configuração ------------------------- */}
      {tela === "configuracao" && (
        <div className="flex-1 overflow-auto p-5">
          <div className="mb-5 max-w-xl">
            <label className="mb-1 block text-sm text-neutral-400">Etapa desta estacao</label>
            <select
              value={etapaSelId}
              onChange={(e) => {
                setEtapaSelId(e.target.value);
                setAtribuicoes({});
              }}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            >
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} ({e.checagens.length} checagens)
                </option>
              ))}
            </select>
          </div>

          <label className="mb-2 block text-sm text-neutral-400">
            Para cada camera (veja a imagem ao vivo), escolha a checagem que ela atende
          </label>
          <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {dispositivos.map((d) => (
              <div key={d.deviceId} className="overflow-hidden rounded-lg bg-neutral-900">
                <video
                  id={`preview-${d.deviceId}`}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-[16/10] w-full bg-black object-cover"
                />
                <div className="flex flex-col gap-2 p-3">
                  <div className="truncate text-xs text-neutral-500">{d.label}</div>
                  <select
                    value={atribuicoes[d.deviceId] ?? ""}
                    onChange={(e) =>
                      setAtribuicoes((prev) => ({ ...prev, [d.deviceId]: e.target.value }))
                    }
                    className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
                  >
                    <option value="">— nao usar esta camera —</option>
                    {etapaSel?.checagens.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <p className="mb-3 min-h-5 text-sm text-amber-500">{aviso}</p>
          <button
            onClick={salvarConfiguracao}
            className="rounded-lg bg-[#2f7a3c] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#28682f]"
          >
            Salvar e iniciar operacao
          </button>
        </div>
      )}

      {/* --------------------------- tela de operação --------------------------- */}
      {tela === "operacao" && (
        <>
          <div
            className={`grid flex-1 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-2 p-2 ${
              processando ? "pointer-events-none opacity-35" : ""
            }`}
          >
            {camsAbertas.map((c) => (
              <div key={c.id} className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-neutral-900">
                <div className="truncate bg-neutral-800 px-3 py-1.5 text-sm">{c.nome}</div>
                <video
                  autoPlay
                  muted
                  playsInline
                  ref={(el) => {
                    if (el) {
                      videosOpRef.current.set(c.id, el);
                      const stream = streamsOpRef.current.get(c.id);
                      if (stream && el.srcObject !== stream) el.srcObject = stream;
                    }
                  }}
                  className="min-h-0 w-full flex-1 bg-black object-contain"
                />
              </div>
            ))}
          </div>
          <footer className="flex items-center gap-4 bg-neutral-900 px-4 py-2.5">
            <button
              onClick={capturarLote}
              disabled={!prontoParaCapturar}
              className="rounded-lg bg-[#2f7a3c] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#28682f] disabled:cursor-default disabled:opacity-45"
            >
              Capturar (Enter)
            </button>
            <span className="text-sm text-neutral-400">{statusOp}</span>
          </footer>
        </>
      )}

      {/* ------------------------ overlay de processamento ----------------------- */}
      {processando && (
        <div className="fixed inset-0 z-10 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-xl bg-neutral-900 px-7 py-5">
            <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-neutral-700 border-t-[#2f7a3c]" />
            <span>Processando lote...</span>
          </div>
        </div>
      )}

      {/* --------------------------- modal do relatório -------------------------- */}
      {relatorio !== null && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/65"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRelatorio(null);
          }}
        >
          <div className="flex max-h-[85vh] w-[min(680px,92vw)] flex-col overflow-hidden rounded-xl bg-neutral-900">
            <div
              className={`px-5 py-3.5 text-base font-semibold ${
                loteAprovado ? "bg-green-950 text-green-300" : "bg-red-950 text-red-300"
              }`}
            >
              {loteAprovado
                ? `Lote aprovado — todas as ${relatorio.length} checagens conferem`
                : `Lote com divergencias — ${relatorio.filter((r) => !r.validacao.sucesso).length} de ${relatorio.length} checagem(ns) reprovaram`}
            </div>
            <div className="overflow-auto px-5 py-4">
              {loteAprovado ? (
                <p className="text-sm text-neutral-400">
                  Nenhuma divergencia encontrada. Transformador liberado para a proxima etapa.
                  (Enter fecha)
                </p>
              ) : (
                relatorio.map((r) => (
                  <div key={r.checagem.id} className="mb-4">
                    <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                      {r.checagem.nome}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          r.validacao.sucesso
                            ? "bg-green-950 text-green-300"
                            : "bg-red-950 text-red-300"
                        }`}
                      >
                        {r.validacao.sucesso ? "OK" : "DIVERGENCIA"}
                      </span>
                    </div>
                    {!r.validacao.sucesso && r.validacao.divergencias.length > 0 ? (
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="text-left text-neutral-500">
                            <th className="border-b border-neutral-800 px-2 py-1.5 font-medium">Ponto</th>
                            <th className="border-b border-neutral-800 px-2 py-1.5 font-medium">Esperado</th>
                            <th className="border-b border-neutral-800 px-2 py-1.5 font-medium">Lido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.validacao.divergencias.map((d, i) => (
                            <tr key={i}>
                              <td className="border-b border-neutral-800 px-2 py-1.5">{d.ponto}</td>
                              <td className="border-b border-neutral-800 px-2 py-1.5">{d.esperado}</td>
                              <td className="border-b border-neutral-800 px-2 py-1.5 text-red-300">{d.lido}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : !r.validacao.sucesso ? (
                      <p className="text-sm text-red-300">{r.validacao.mensagem}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end bg-neutral-950 px-5 py-3">
              <button
                onClick={() => setRelatorio(null)}
                className="rounded-lg bg-neutral-700 px-5 py-2 text-sm hover:bg-neutral-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
