"use client";

// Preview local, básico: se ESTA máquina tiver uma câmera UVC cujo rótulo
// bate com o nome cadastrado, abre o stream e mostra ao vivo. Sem
// sinalização entre máquinas — é so getUserMedia direto, igual à tela
// /estacao. Se a máquina não tiver essa câmera plugada, fica sem sinal.

import { useEffect, useRef, useState } from "react";

export type DispositivoLocal = { deviceId: string; label: string };

/** Lista as câmeras (UVC) conectadas NESTA máquina — pede permissão uma vez
 *  para revelar os rótulos, filtra câmeras virtuais de software. Usado no
 *  cadastro para restringir a criação a dispositivos realmente conectados. */
export function useDispositivosLocais() {
  const [dispositivos, setDispositivos] = useState<DispositivoLocal[]>([]);
  const [detectando, setDetectando] = useState(false);
  const [erro, setErro] = useState("");

  async function detectar() {
    setDetectando(true);
    setErro("");
    try {
      if (!navigator.mediaDevices) {
        throw new Error(
          "API de câmera indisponível — acesse por localhost ou HTTPS válido.",
        );
      }
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach((t) => t.stop());
      const lista = (await navigator.mediaDevices.enumerateDevices())
        .filter((d) => d.kind === "videoinput")
        .filter((d) => !/virtual/i.test(d.label))
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Câmera ${i + 1}` }));
      setDispositivos(lista);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setDetectando(false);
    }
  }

  return { dispositivos, detectando, erro, detectar };
}

export function useCameraLocalPorNome(nome: string) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [encontrada, setEncontrada] = useState<boolean | null>(null); // null = ainda checando
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function abrir() {
      try {
        if (!navigator.mediaDevices) {
          if (!cancelado) setEncontrada(false);
          return;
        }
        // getUserMedia generico primeiro, para os labels dos dispositivos aparecerem
        const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
        tmp.getTracks().forEach((t) => t.stop());

        const dispositivos = (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === "videoinput",
        );
        const match = dispositivos.find((d) => d.label === nome);
        if (!match) {
          if (!cancelado) setEncontrada(false);
          return;
        }

        const s = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: match.deviceId } },
        });
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        setStream(s);
        setEncontrada(true);
      } catch {
        if (!cancelado) setEncontrada(false);
      }
    }
    abrir();

    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [nome]);

  return { stream, encontrada };
}
