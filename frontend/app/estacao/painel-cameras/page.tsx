"use client";

// Painel de operação remota das câmeras — TELA ESCONDIDA de propósito:
// não existe link para ela em nenhum menu/sidebar, só é alcançada por quem
// souber a URL. Fica fora do login (mesma decisão de /estacao — ferramenta
// de chão de fábrica), então usa /api/estacao/cameras (login de serviço no
// servidor) em vez de /api/cameras (que exige sessão do operador).
//
// Qualquer máquina que abra esta URL vê as câmeras cadastradas e pode
// apertar "Capturar"; quem tiver a câmera fisicamente conectada (rodando
// esta mesma tela, ou a aba "Ao vivo" de /cameras) atende o pedido. A foto
// capturada é ENVIADA à conferência real no checkpoint vinculado à câmera
// (vista = fonteFisica da câmera), com a etiqueta abaixo como ground truth.

import { useEffect, useState } from "react";
import { CameraFeedCard, type CameraFeedInfo } from "@/components/camera/camera-feed-card";

// Etiqueta (QR) da peça atual — em produção a leitura seria automática no
// gate de adesivação; aqui vem pré-preenchida com a peça de demonstração
// (mesmo default da estação de captura).
const ETIQUETA_DEMO =
  "Pedido: 68202\nNúm. Série: 847233\nSeq: 86\nPatrimônio: 251328\nCliente: 143091 - Energisa Rondônia Distribuidora de Energia S.A\nTPD-408136";

export default function PainelCamerasPage() {
  const [cameras, setCameras] = useState<CameraFeedInfo[] | null>(null);
  const [erro, setErro] = useState("");
  const [etiqueta, setEtiqueta] = useState(ETIQUETA_DEMO);

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      try {
        const resp = await fetch("/api/estacao/cameras");
        const json: { cameras: CameraFeedInfo[]; erro?: string } = await resp.json();
        if (!vivo) return;
        setCameras(json.cameras);
        setErro(json.erro ?? "");
      } catch (e) {
        if (vivo) setErro((e as Error).message);
      }
    }
    carregar();
    const intervalo = setInterval(carregar, 15000); // pega câmeras cadastradas depois
    return () => {
      vivo = false;
      clearInterval(intervalo);
    };
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-neutral-100">
      <h1 className="mb-1 text-lg font-semibold">Painel de câmeras — operação remota</h1>
      <p className="mb-4 text-sm text-neutral-400">
        Dispare a captura de qualquer câmera cadastrada; quem estiver com ela
        fisicamente conectada (nesta ou em outra máquina) atende o pedido. A
        foto vai para a conferência no checkpoint vinculado à câmera.
      </p>

      <details className="mb-5 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
        <summary className="cursor-pointer text-neutral-400">
          Etiqueta da peça atual (QR)
          {etiqueta.trim() ? "" : " — OBRIGATÓRIA para enviar ao checkpoint"}
        </summary>
        <textarea
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
          rows={5}
          spellCheck={false}
          className="mt-2 w-full max-w-2xl rounded-md border border-neutral-700 bg-neutral-800 p-2 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-neutral-500">
          É dela que saem os valores esperados — em produção a câmera lê o QR
          sozinha no gate de adesivação.
        </p>
      </details>

      {erro && (
        <p className="mb-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {erro}
        </p>
      )}

      {cameras === null ? (
        <p className="text-sm text-neutral-400">Carregando câmeras…</p>
      ) : cameras.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Nenhuma câmera cadastrada ainda — cadastre em /cameras.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {cameras.map((camera) => (
            <CameraFeedCard key={camera.id} camera={camera} etiqueta={etiqueta} />
          ))}
        </div>
      )}
    </main>
  );
}
