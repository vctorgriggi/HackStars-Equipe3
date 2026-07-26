// Card de câmera com preview local + captura remota, compartilhado entre
// a tela oficial (/cameras, aba Ao vivo) e a tela escondida de operação
// (/estacao/painel-cameras). Recebe só o essencial (id/nome/vista) — não
// depende do CameraApi completo, então serve os dois contextos.

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
};

export function CameraFeedCard({ camera }: { camera: CameraFeedInfo }) {
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

  async function dispararCaptura() {
    await fetch(`/api/estacao/ordens?id=${camera.id}`, { method: "POST" });
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
      <div className="flex items-center gap-2 border-t border-line px-3 py-2">
        <button
          type="button"
          onClick={dispararCaptura}
          disabled={pendente}
          className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-2xs text-text-2 hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="camera" size={13} />
          {pendente ? "Capturando…" : "Capturar"}
        </button>
        {ultimaCapturaTs && (
          <a
            href={`/api/estacao/ordens/resultado?id=${camera.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-2xs text-text-3 underline hover:text-text-1"
          >
            última captura {new Date(ultimaCapturaTs).toLocaleTimeString()}
          </a>
        )}
      </div>
    </div>
  );
}
