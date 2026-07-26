// Card de câmera com preview local + captura remota, compartilhado entre
// a tela oficial (/cameras, aba Ao vivo) e a tela escondida de operação
// (/estacao/painel-cameras). Recebe só o essencial (id/nome/vista) — não
// depende do CameraApi completo, então serve os dois contextos.
//
// Com `etiqueta` presente (painel de operação), "Capturar" faz o ciclo
// completo da câmera fixa: dispara a ordem, espera a máquina que tem a
// câmera atender, baixa o frame e o envia à conferência REAL no checkpoint
// vinculado (`/api/estacao/conferir` → executar-com-fotos, com a vista da
// câmera como fonteFisica). Quem decide o veredito é o servidor — o card só
// exibe. Sem checkpoint ou sem etiqueta, a captura acontece e o não-envio é
// ANUNCIADO — nunca um envio silenciosamente pulado.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useCameraLocalPorNome } from "@/lib/webrtc/preview-local";
import fotoTransformador from "@/public/transformador.png";

export type CameraFeedInfo = {
  id: string;
  nome: string;
  fonteFisica: string;
  ativa?: boolean;
  /** Gate onde a câmera está instalada; o envio da captura vai para ele. */
  checkpoint?: { id: string; nome: string; codigo: string } | null;
};

type ResultadoEnvio =
  | { tipo: "veredito"; vereditoGeral: string; passagemRegistrada: boolean }
  | { tipo: "aviso"; mensagem: string }
  | { tipo: "erro"; mensagem: string };

const COR_DO_VEREDITO: Record<string, string> = {
  conforme: "text-reading-success",
  divergente: "text-reading-mismatch",
  nao_conferivel: "text-reading-lowconf",
};

export function CameraFeedCard({
  camera,
  mostrarAcoes = true,
  etiqueta,
}: {
  camera: CameraFeedInfo;
  /** Esconde o botão "Capturar" e o link da última captura (usado na tela
   *  principal, que deve ficar limpa; a tela escondida de operação mostra). */
  mostrarAcoes?: boolean;
  /** Payload da etiqueta (QR) da peça atual — o ground truth da conferência.
   *  Quando presente, a captura é ENVIADA ao checkpoint vinculado. */
  etiqueta?: string;
}) {
  const { stream, encontrada } = useCameraLocalPorNome(camera.nome);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const aoVivo = encontrada === true;

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  // ---- captura remota: qualquer máquina dispara, quem tem a câmera atende ----
  const [pendente, setPendente] = useState(false);
  const [ultimaCapturaTs, setUltimaCapturaTs] = useState<number | null>(null);

  // status (pendente + timestamp da última foto), consultado por qualquer máquina
  useEffect(() => {
    let vivo = true;
    async function checar() {
      try {
        const r = await fetch(`/api/estacao/ordens?id=${camera.id}`);
        const json: { pendente: boolean; ultimaCapturaTs: number | null } = await r.json();
        if (vivo) {
          setPendente(json.pendente);
          setUltimaCapturaTs(json.ultimaCapturaTs);
        }
      } catch {
        /* tenta de novo no proximo ciclo */
      }
    }
    checar();
    const intervalo = setInterval(checar, 1500);
    return () => {
      vivo = false;
      clearInterval(intervalo);
    };
  }, [camera.id]);

  // agente: só atua se ESTA máquina tem a câmera aberta localmente
  useEffect(() => {
    if (!aoVivo) return;
    const intervalo = setInterval(async () => {
      const r = await fetch(`/api/estacao/ordens?id=${camera.id}`);
      const status: { pendente: boolean } = await r.json();
      if (!status.pendente || !videoRef.current) return;
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.95));
      if (blob) {
        await fetch(`/api/estacao/ordens/resultado?id=${camera.id}`, {
          method: "POST",
          body: blob,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
    }, 1200);
    return () => clearInterval(intervalo);
  }, [aoVivo, camera.id]);

  // ---- capturar + enviar ao checkpoint vinculado ----
  const [fase, setFase] = useState<"parado" | "capturando" | "conferindo">("parado");
  const [resultadoEnvio, setResultadoEnvio] = useState<ResultadoEnvio | null>(null);

  /** Espera a máquina que tem a câmera atender a ordem (foto nova no
   *  servidor). O agente responde em ~1,2s quando existe; 20s sem resposta
   *  significa que ninguém tem esta câmera aberta agora. */
  async function esperarFotoNova(tsAntes: number | null): Promise<number | null> {
    const inicio = Date.now();
    while (Date.now() - inicio < 20_000) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const r = await fetch(`/api/estacao/ordens?id=${camera.id}`);
        const json: { ultimaCapturaTs: number | null } = await r.json();
        if (json.ultimaCapturaTs && json.ultimaCapturaTs !== tsAntes) {
          setUltimaCapturaTs(json.ultimaCapturaTs);
          return json.ultimaCapturaTs;
        }
      } catch {
        /* rede oscilou; tenta de novo no proximo ciclo */
      }
    }
    return null;
  }

  async function dispararCaptura() {
    if (fase !== "parado") return;
    setResultadoEnvio(null);
    setFase("capturando");
    try {
      const tsAntes = ultimaCapturaTs;
      await fetch(`/api/estacao/ordens?id=${camera.id}`, { method: "POST" });
      const tsNovo = await esperarFotoNova(tsAntes);
      if (!tsNovo) {
        setResultadoEnvio({
          tipo: "erro",
          mensagem: "Nenhuma máquina com esta câmera atendeu a captura.",
        });
        return;
      }
      // Sem checkpoint ou sem etiqueta o envio não existe — a captura fica
      // guardada e o motivo aparece, nunca some calado.
      if (!camera.checkpoint) {
        setResultadoEnvio({
          tipo: "aviso",
          mensagem: "Captura feita, mas NÃO enviada — câmera sem checkpoint vinculado (vincule em Câmeras › Cadastro).",
        });
        return;
      }
      if (!etiqueta?.trim()) {
        setResultadoEnvio({
          tipo: "aviso",
          mensagem: "Captura feita, mas NÃO enviada — etiqueta (QR) da peça vazia.",
        });
        return;
      }

      setFase("conferindo");
      const fotoResp = await fetch(`/api/estacao/ordens/resultado?id=${camera.id}`, {
        cache: "no-store",
      });
      if (!fotoResp.ok) throw new Error("não foi possível baixar a captura do servidor");
      const foto = await fotoResp.blob();

      const dados = new FormData();
      dados.append("payloadQr", etiqueta.trim());
      dados.append("etapaCodigo", camera.checkpoint.codigo);
      dados.append(`foto:${camera.fonteFisica}`, foto, `${camera.fonteFisica}.jpg`);
      const resp = await fetch("/api/estacao/conferir", { method: "POST", body: dados });
      const json: {
        ok: boolean;
        erro?: string;
        vereditoGeral?: string;
        passagemRegistrada?: boolean;
      } = await resp.json();
      if (!json.ok) throw new Error(json.erro ?? `conferência respondeu ${resp.status}`);
      setResultadoEnvio({
        tipo: "veredito",
        vereditoGeral: json.vereditoGeral ?? "desconhecido",
        passagemRegistrada: Boolean(json.passagemRegistrada),
      });
    } catch (e) {
      setResultadoEnvio({ tipo: "erro", mensagem: (e as Error).message });
    } finally {
      setFase("parado");
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-1 shadow-1">
      <div className="relative bg-surface-inset" style={{ aspectRatio: "16/9" }}>
        {aoVivo ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 90% at 30% 20%, #1a222c 0%, #0c1117 65%), repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 2px, transparent 2px 26px)",
              }}
            />
            {camera.ativa !== false && (
              <Image
                src={fotoTransformador}
                alt=""
                aria-hidden
                className="absolute left-1/2 top-1/2 h-[72%] w-auto -translate-x-1/2 -translate-y-1/2 opacity-40"
              />
            )}
          </>
        )}
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{ background: "var(--overlay-scrim)" }}
        />
        <span
          className="t-mono absolute left-2 top-2 flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-0.5 text-2xs text-white"
          style={{ background: "var(--overlay-chip-bg)" }}
        >
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${aoVivo ? "tv-pulse bg-reading-success" : "bg-surface-3"}`}
          />
          {camera.nome}
        </span>
        <span
          className="t-mono absolute bottom-2 left-2 rounded-[var(--radius-pill)] px-2 py-0.5 text-2xs text-white"
          style={{ background: "var(--overlay-chip-bg)" }}
        >
          vista: {camera.fonteFisica}
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <span
          aria-hidden
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: aoVivo ? "var(--color-reading-success)" : "var(--text-3)" }}
        />
        <span className="text-xs text-text-2">
          {aoVivo
            ? "Ao vivo (preview local)"
            : encontrada === null
              ? "Procurando a câmera nesta máquina…"
              : "Sem sinal — esta câmera não está conectada a esta máquina"}
        </span>
      </div>
      {mostrarAcoes && (
        <div className="border-t border-line px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={dispararCaptura}
              disabled={pendente || fase !== "parado"}
              className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-2xs text-text-2 hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="camera" size={13} />
              {fase === "conferindo"
                ? "Conferindo…"
                : fase === "capturando" || pendente
                  ? "Capturando…"
                  : "Capturar"}
            </button>
            <span className="min-w-0 truncate text-2xs text-text-3">
              {camera.checkpoint
                ? `envia para ${camera.checkpoint.nome}`
                : "sem checkpoint vinculado"}
            </span>
            {ultimaCapturaTs && (
              <a
                href={`/api/estacao/ordens/resultado?id=${camera.id}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex-none text-2xs text-text-3 underline hover:text-text-1"
              >
                última captura {new Date(ultimaCapturaTs).toLocaleTimeString()}
              </a>
            )}
          </div>
          {fase === "conferindo" && (
            <p className="mt-1.5 text-2xs text-text-3">
              Lendo a foto na visão e comparando com a etiqueta… (alguns segundos)
            </p>
          )}
          {resultadoEnvio && (
            <p
              className={`mt-1.5 text-2xs ${
                resultadoEnvio.tipo === "veredito"
                  ? (COR_DO_VEREDITO[resultadoEnvio.vereditoGeral] ?? "text-reading-lowconf")
                  : resultadoEnvio.tipo === "aviso"
                    ? "text-reading-lowconf"
                    : "text-reading-mismatch"
              }`}
            >
              {resultadoEnvio.tipo === "veredito"
                ? `Conferência no checkpoint: ${resultadoEnvio.vereditoGeral.replace("_", " ")}` +
                  (resultadoEnvio.passagemRegistrada ? " — passagem registrada" : "")
                : resultadoEnvio.mensagem}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
