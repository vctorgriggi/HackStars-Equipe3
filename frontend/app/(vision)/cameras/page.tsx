"use client";

// Módulo Câmeras: 2 abas em pill (Ao vivo / Cadastro), via URL (?view=).
// Ao vivo: banner de linha parada + 4 mini-KPIs + grupos por checkpoint.
// Cadastro: nova câmera + vínculo com checkpoint (vincular move o vínculo).
// A foto da esteira não veio no handoff → o feed usa backdrop CSS
// (surface-inset + gradiente) com a foto do transformador como sujeito.

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReadingStatus } from "@/lib/domain/types";
import { READING_HC_VAR, READING_VAR } from "@/lib/domain/status";
import { useCameras, useCreateCamera } from "@/lib/data/use-cameras";
import { useCheckpoints, useLinkCamera } from "@/lib/data/use-checkpoints";
import { useRealtime } from "@/lib/stores/realtime";
import { Icon } from "@/components/ui/icon";
import { PillSwitcher } from "@/components/ui/pill-switcher";
import { Select } from "@/components/ui/select";
import { SkeletonKpis, SkeletonRows } from "@/components/ui/skeleton";
import fotoTransformador from "@/public/transformador.png";

// Leituras simuladas por câmera (mapa LEIT do protótipo, linhas 1264–1272).
const LEITURAS: Record<string, [string, string, ReadingStatus]> = {
  "CAM-01": ["TR-847241", "98,4%", "success"],
  "CAM-02": ["TR-847234", "97,1%", "success"],
  "CAM-03": ["TR-847245", "71,3%", "lowconf"],
  "CAM-04": ["TR-847251", "96,8%", "success"],
  "CAM-05": ["TR-847250", "99,0%", "processing"], // mismatch com linha parada
  "CAM-06": ["TR-847256", "98,9%", "success"],
  "CAM-07": ["TR-847246", "99,2%", "success"],
};

const TEXTO_STATUS: Record<string, string> = {
  success: "Leitura confirmada",
  lowconf: "Divergência — verificação manual",
  mismatch: "Linha parada — chassi divergente",
  processing: "Aguardando próxima leitura",
};

function MiniKpi({
  label,
  valor,
  cor,
}: {
  label: string;
  valor: string;
  cor?: string;
}) {
  return (
    <div className="grid gap-0.5 rounded-lg border border-line bg-surface-1 px-4 py-3 shadow-1">
      <span className="t-caps text-2xs text-text-3">{label}</span>
      <span
        className="t-mono text-xl font-bold text-text-1"
        style={cor ? { color: cor } : undefined}
      >
        {valor}
      </span>
    </div>
  );
}

function FeedCamera({
  id,
  online,
  linhaParada,
}: {
  id: string;
  online: boolean;
  linhaParada: boolean;
}) {
  let leitura = "—";
  let conf = "—";
  let st: ReadingStatus = "processing";
  if (online) {
    const l = LEITURAS[id];
    if (l) {
      [leitura, conf, st] = l;
      if (id === "CAM-05" && linhaParada) st = "mismatch";
    }
  }
  const boxCor = online ? READING_HC_VAR[st] : "var(--text-3)";
  const stCor = online ? READING_VAR[st] : "var(--text-3)";
  const stTxt = online ? TEXTO_STATUS[st] : "Câmera offline";
  const borda =
    online && st === "mismatch"
      ? "var(--color-reading-mismatch)"
      : "var(--border)";

  return (
    <div
      className="overflow-hidden rounded-lg bg-surface-1 shadow-1"
      style={{ border: `1px solid ${borda}` }}
    >
      <div
        className="relative bg-surface-inset"
        style={{ aspectRatio: "16/9" }}
      >
        {/* backdrop gerado (foto da esteira ausente do handoff) */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 30% 20%, #1a222c 0%, #0c1117 65%), repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 2px, transparent 2px 26px)",
          }}
        />
        {online && (
          <Image
            src={fotoTransformador}
            alt=""
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[72%] w-auto -translate-x-1/2 -translate-y-1/2 opacity-90"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{ background: "var(--overlay-scrim)" }}
        />
        {online && (
          <div
            aria-hidden
            className="absolute rounded-xs"
            style={{
              left: "36%",
              top: "20%",
              width: "30%",
              height: "58%",
              border: `2px solid ${boxCor}`,
            }}
          />
        )}
        <span
          className="t-mono absolute left-2 top-2 flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-0.5 text-2xs text-white"
          style={{ background: "var(--overlay-chip-bg)" }}
        >
          <span
            aria-hidden
            className="tv-pulse h-1.5 w-1.5 rounded-full bg-reading-mismatch"
          />
          {id}
        </span>
        {online && (
          <span
            className="t-mono absolute bottom-2 left-2 rounded-[var(--radius-pill)] px-2 py-0.5 text-2xs"
            style={{ background: "var(--overlay-chip-bg)", color: boxCor }}
          >
            {leitura} · {conf}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <span
          aria-hidden
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: stCor }}
        />
        <span className="text-xs text-text-2">{stTxt}</span>
      </div>
    </div>
  );
}

export default function CamerasPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const view = sp.get("view") === "reg" ? "reg" : "live";

  const { data: cameras = [], isPending: camerasPending } = useCameras();
  const { data: checkpoints = [] } = useCheckpoints();
  const createCamera = useCreateCamera();
  const link = useLinkCamera();

  const linhaParada = useRealtime((s) => s.linhaParada);
  const liberarLinha = useRealtime((s) => s.liberarLinha);

  const onlinePorId = new Map(cameras.map((c) => [c.id, c.online]));
  const camsOnline = `${cameras.filter((c) => c.online).length}/${cameras.length}`;

  const opcoesVinculo = [
    { value: "", label: "Sem vínculo" },
    ...checkpoints.map((c) => ({ value: c.id, label: c.nome })),
  ];
  const vinculoDaCamera = (camId: string) =>
    checkpoints.find((c) => c.cameraIds.includes(camId))?.id ?? "";

  if (camerasPending) {
    return (
      <div className="grid gap-4">
        <SkeletonKpis />
        <SkeletonRows n={6} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PillSwitcher
        value={view}
        onValueChange={(v) => {
          const params = new URLSearchParams(sp);
          if (v === "live") params.delete("view");
          else params.set("view", v);
          router.replace(`${pathname}?${params.toString()}`, {
            scroll: false,
          });
        }}
        options={[
          { value: "live", label: "Ao vivo" },
          { value: "reg", label: "Cadastro" },
        ]}
        ariaLabel="Modo do módulo de câmeras"
      />

      {view === "live" ? (
        <>
          {linhaParada && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-reading-mismatch-soft px-4 py-3"
              style={{ borderColor: "var(--color-reading-mismatch)" }}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 flex-none rounded-full bg-reading-mismatch"
                style={{
                  animation: "tvPulse 1.2s var(--ease-standard) infinite",
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-1">
                  Linha parada — checkpoint Ensaios
                </p>
                <p className="text-xs text-text-2">
                  Divergência de chassi em{" "}
                  <span className="t-mono">TR-847250</span> — leitura não
                  confere com o pedido
                </p>
              </div>
              <button
                type="button"
                onClick={liberarLinha}
                className="h-10 flex-none rounded-md bg-brand-primary px-4 text-sm font-medium text-brand-on hover:bg-brand-primary-600 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
              >
                Liberar linha
              </button>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
            <MiniKpi label="Câmeras online" valor={camsOnline} />
            <MiniKpi label="Leituras hoje" valor="128" />
            <MiniKpi label="Validação automática" valor="91%" />
            <MiniKpi
              label="Paradas de linha hoje"
              valor={linhaParada ? "1" : "0"}
              cor={
                linhaParada ? "var(--color-reading-mismatch)" : undefined
              }
            />
          </div>

          {checkpoints.map((ck) => (
            <section key={ck.id}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="t-caps text-2xs text-text-3">Checkpoint</span>
                <span className="text-md font-semibold text-text-1">
                  {ck.nome}
                </span>
              </div>
              {ck.cameraIds.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-line-strong p-4 text-sm text-text-3">
                  <Icon name="camera-off" size={18} />
                  Nenhuma câmera vinculada a este checkpoint — vincule em
                  Câmeras › Cadastro.
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                  {ck.cameraIds.map((camId) => (
                    <FeedCamera
                      key={camId}
                      id={camId}
                      online={onlinePorId.get(camId) ?? true}
                      linhaParada={linhaParada}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-text-2">
              Câmeras cadastradas e vínculo com checkpoints
            </span>
            <button
              type="button"
              onClick={() => createCamera.mutate()}
              className="ml-auto flex h-10 items-center gap-1.5 rounded-md bg-brand-primary px-4 text-sm font-medium text-brand-on hover:bg-brand-primary-600 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
            >
              <Icon name="plus" size={15} /> Nova câmera
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-surface-1 shadow-1">
            {cameras.map((cam) => (
              <div
                key={cam.id}
                className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <span className="t-mono w-16 flex-none text-sm font-semibold">
                  {cam.id}
                </span>
                <span className="t-mono min-w-0 flex-[1_1_170px] truncate text-2xs text-text-3">
                  {cam.endpoint}
                </span>
                <span className="flex w-[70px] items-center gap-1.5 text-xs text-text-2">
                  <span
                    aria-hidden
                    className="h-[7px] w-[7px] rounded-full"
                    style={{
                      background: cam.online
                        ? "var(--color-reading-success)"
                        : "var(--text-3)",
                    }}
                  />
                  {cam.online ? "online" : "offline"}
                </span>
                <Select
                  value={vinculoDaCamera(cam.id)}
                  onValueChange={(v) =>
                    link.mutate({
                      cameraId: cam.id,
                      checkpointId: v === "" ? null : v,
                    })
                  }
                  options={opcoesVinculo}
                  ariaLabel={`Checkpoint vinculado a ${cam.id}`}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
