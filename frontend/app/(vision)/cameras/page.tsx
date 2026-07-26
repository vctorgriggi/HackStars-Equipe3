"use client";

// Módulo Câmeras — API REAL (CRUD de provisionamento em /api/cameras).
// 2 abas em pill via URL (?view=): Ao vivo agrupa as câmeras cadastradas
// pelo checkpoint REAL (ordem da linha; "Sem vínculo" ao final); Cadastro
// cria/edita/exclui e vincula ao gate. Não há câmera física nesta rodada:
// o quadro do feed é PLACEHOLDER declarado (backdrop CSS), e `ativa` é
// estado administrativo do cadastro — nunca medição de "online".

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CameraApi } from "@/lib/domain/camera-api";
import type { AtualizarCameraPayload } from "@/lib/domain/camera-api";
import { FONTES_FISICAS_API } from "@/lib/domain/camera-api";
import type { EtapaLinhaApi } from "@/lib/domain/transformador-api";
import {
  useAtualizarCamera,
  useCamerasApi,
  useCriarCamera,
  useExcluirCamera,
} from "@/lib/data/use-cameras-api";
import { useEtapasLinha } from "@/lib/data/use-transformadores-api";
import { useCameraLocalPorNome, useDispositivosLocais } from "@/lib/webrtc/preview-local";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { PillSwitcher } from "@/components/ui/pill-switcher";
import { Select } from "@/components/ui/select";
import { SkeletonKpis, SkeletonRows } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import fotoTransformador from "@/public/transformador.png";

const OPCOES_FONTE = FONTES_FISICAS_API.map((fonte) => ({
  value: fonte,
  label: fonte,
}));

function MiniKpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="grid gap-0.5 rounded-lg border border-line bg-surface-1 px-4 py-3 shadow-1">
      <span className="t-caps text-2xs text-text-3">{label}</span>
      <span className="t-mono text-xl font-bold text-text-1">{valor}</span>
    </div>
  );
}

// Quadro do feed: placeholder CSS declarado (não há stream nesta rodada).
// O que é REAL aqui: nome, vista (fonteFisica) e o estado `ativa` do cadastro.
function FeedCamera({ camera }: { camera: CameraApi }) {
  const { stream, encontrada } = useCameraLocalPorNome(camera.nome);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const aoVivo = encontrada === true;

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-1 shadow-1">
      <div
        className="relative bg-surface-inset"
        style={{ aspectRatio: "16/9" }}
      >
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
            {camera.ativa && (
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
          style={{
            background: aoVivo
              ? "var(--color-reading-success)"
              : "var(--text-3)",
          }}
        />
        <span className="text-xs text-text-2">
          {aoVivo
            ? "Ao vivo (preview local)"
            : encontrada === null
              ? "Procurando a câmera nesta máquina…"
              : "Sem sinal — esta câmera não está conectada a esta máquina"}
        </span>
      </div>
    </div>
  );
}

function FormNovaCamera({
  etapas,
  onCriar,
  criando,
}: {
  etapas: EtapaLinhaApi[];
  onCriar: (payload: {
    nome: string;
    fonteFisica: (typeof FONTES_FISICAS_API)[number];
    ativa: boolean;
    endpoint?: string | null;
    checkpoint?: { id: string } | null;
  }) => void;
  criando: boolean;
}) {
  const { dispositivos, detectando, erro, detectar } = useDispositivosLocais();
  const [deviceId, setDeviceId] = useState("");
  const [nome, setNome] = useState("");
  const [fonte, setFonte] = useState<string>("geral");
  const [checkpointId, setCheckpointId] = useState("");

  const opcoesEtapa = [
    { value: "", label: "Sem vínculo" },
    ...etapas.map((etapa) => ({ value: etapa.id, label: etapa.nome })),
  ];
  const opcoesDispositivo = dispositivos.map((d) => ({
    value: d.deviceId,
    label: d.label,
  }));

  // só cadastra a partir de uma câmera detectada NESTA máquina — nome segue
  // o rótulo do dispositivo (editável, mas não pode ficar vazio)
  const podeEnviar = deviceId !== "" && nome.trim().length > 0 && !criando;

  return (
    <form
      className="grid gap-3 rounded-lg border border-line bg-surface-1 p-4 shadow-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!podeEnviar) return;
        onCriar({
          nome: nome.trim(),
          fonteFisica: fonte as (typeof FONTES_FISICAS_API)[number],
          ativa: true,
          endpoint: null,
          checkpoint: checkpointId ? { id: checkpointId } : null,
        });
        setNome("");
        setDeviceId("");
      }}
    >
      <div className="flex items-center justify-between">
        <span className="t-caps text-2xs text-text-3">Nova câmera</span>
        <button
          type="button"
          onClick={detectar}
          disabled={detectando}
          className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-2xs text-text-2 hover:bg-surface-3 disabled:opacity-50"
        >
          <Icon name="camera" size={13} />
          {detectando ? "Detectando…" : "Detectar câmeras conectadas"}
        </button>
      </div>

      {erro && <p className="text-xs text-reading-mismatch">{erro}</p>}

      {dispositivos.length === 0 ? (
        <p className="text-xs text-text-3">
          Nenhuma câmera detectada ainda — clique em &quot;Detectar câmeras
          conectadas&quot; e autorize o acesso. Só é possível cadastrar
          câmeras fisicamente conectadas a esta máquina.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={deviceId}
            onValueChange={(v) => {
              setDeviceId(v);
              const d = dispositivos.find((x) => x.deviceId === v);
              if (d) setNome(d.label);
            }}
            options={[{ value: "", label: "Selecione a câmera…" }, ...opcoesDispositivo]}
            ariaLabel="Câmera conectada nesta máquina"
          />
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome (ex.: CAM-05)"
            aria-label="Nome da câmera"
            className="h-9 min-w-0 flex-1 basis-36 rounded-md border border-line bg-surface-2 px-3 text-sm text-text-1 outline-none placeholder:text-text-3 focus-visible:[box-shadow:var(--ring-focus)]"
          />
          <Select
            value={fonte}
            onValueChange={setFonte}
            options={OPCOES_FONTE}
            ariaLabel="Vista da peça que a câmera enxerga"
          />
          <Select
            value={checkpointId}
            onValueChange={setCheckpointId}
            options={opcoesEtapa}
            ariaLabel="Checkpoint da nova câmera"
          />
          <button
            type="submit"
            disabled={!podeEnviar}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-brand-primary px-4 text-sm font-medium text-brand-on hover:bg-brand-primary-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)] desk:w-auto"
          >
            <Icon name="plus" size={15} />
            {criando ? "Cadastrando…" : "Cadastrar"}
          </button>
        </div>
      )}
    </form>
  );
}

function LinhaCamera({
  camera,
  opcoesVinculo,
  onAtualizar,
  onExcluir,
  excluindo,
}: {
  camera: CameraApi;
  opcoesVinculo: { value: string; label: string }[];
  onAtualizar: (payload: AtualizarCameraPayload) => void;
  onExcluir: () => void;
  excluindo: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <span className="t-mono w-20 flex-none text-sm font-semibold">
        {camera.nome}
      </span>
      <Select
        value={camera.fonteFisica}
        onValueChange={(v) =>
          onAtualizar({ fonteFisica: v as (typeof FONTES_FISICAS_API)[number] })
        }
        options={OPCOES_FONTE}
        ariaLabel={`Vista da câmera ${camera.nome}`}
        className="h-8 text-xs"
      />
      <Select
        value={camera.checkpoint?.id ?? ""}
        onValueChange={(v) =>
          onAtualizar({ checkpoint: v === "" ? null : { id: v } })
        }
        options={opcoesVinculo}
        ariaLabel={`Checkpoint vinculado a ${camera.nome}`}
        className="h-8 text-xs"
      />
      <span className="flex items-center gap-2 text-xs text-text-2">
        <ToggleSwitch
          checked={camera.ativa}
          onCheckedChange={(v) => onAtualizar({ ativa: v })}
          label={`Câmera ${camera.nome} ativa`}
        />
        {camera.ativa ? "ativa" : "inativa"}
      </span>
      <button
        type="button"
        onClick={onExcluir}
        disabled={excluindo}
        aria-label={`Excluir câmera ${camera.nome}`}
        className="ml-auto flex h-8 w-8 flex-none items-center justify-center rounded-md border border-line text-text-3 hover:bg-surface-3 hover:text-text-1 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}

export default function CamerasPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const view = sp.get("view") === "reg" ? "reg" : "live";

  const {
    data: cameras = [],
    isPending,
    isError,
    refetch,
  } = useCamerasApi();
  const { data: etapas = [] } = useEtapasLinha();
  const criar = useCriarCamera();
  const atualizar = useAtualizarCamera();
  const excluir = useExcluirCamera();

  const ativas = cameras.filter((c) => c.ativa).length;

  // Agrupamento pelo `codigo` do checkpoint (estável); ordem = ordem da
  // linha. Câmera sem vínculo ganha grupo próprio ao final.
  const grupos = [
    ...[...etapas]
      .sort((a, b) => a.ordem - b.ordem)
      .map((etapa) => ({
        chave: etapa.codigo,
        titulo: etapa.nome,
        cameras: cameras.filter((c) => c.checkpoint?.codigo === etapa.codigo),
      })),
    {
      chave: "sem-vinculo",
      titulo: "Sem vínculo",
      cameras: cameras.filter((c) => !c.checkpoint),
    },
  ].filter((grupo) => grupo.chave !== "sem-vinculo" || grupo.cameras.length > 0);

  const opcoesVinculo = [
    { value: "", label: "Sem vínculo" },
    ...etapas.map((etapa) => ({ value: etapa.id, label: etapa.nome })),
  ];

  if (isPending) {
    return (
      <div className="grid gap-4">
        <SkeletonKpis />
        <SkeletonRows n={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Não foi possível carregar as câmeras"
        description="A API não respondeu. Verifique a conexão e tente de novo."
        action={{ label: "Tentar novamente", onClick: () => void refetch() }}
      />
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
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
            <MiniKpi
              label="Câmeras ativas"
              valor={`${ativas}/${cameras.length}`}
            />
            <MiniKpi label="Gates da linha" valor={String(etapas.length)} />
          </div>

          {cameras.length === 0 ? (
            <EmptyState
              title="Nenhuma câmera cadastrada"
              description="Cadastre a primeira câmera na aba Cadastro e vincule-a a um checkpoint da linha."
              action={{
                label: "Ir para o cadastro",
                onClick: () =>
                  router.replace(`${pathname}?view=reg`, { scroll: false }),
              }}
            />
          ) : (
            grupos.map((grupo) => (
              <section key={grupo.chave}>
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="t-caps text-2xs text-text-3">
                    Checkpoint
                  </span>
                  <span className="text-md font-semibold text-text-1">
                    {grupo.titulo}
                  </span>
                </div>
                {grupo.cameras.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-line-strong p-4 text-sm text-text-3">
                    <Icon name="camera-off" size={18} />
                    Nenhuma câmera vinculada a este checkpoint — vincule em
                    Câmeras › Cadastro.
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                    {grupo.cameras.map((camera) => (
                      <FeedCamera key={camera.id} camera={camera} />
                    ))}
                  </div>
                )}
              </section>
            ))
          )}
        </>
      ) : (
        <>
          <FormNovaCamera
            etapas={etapas}
            criando={criar.isPending}
            onCriar={(payload) => criar.mutate(payload)}
          />

          {cameras.length === 0 ? (
            <EmptyState
              title="Nenhuma câmera cadastrada"
              description="Use o formulário acima para cadastrar a primeira câmera."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-surface-1 shadow-1">
              {cameras.map((camera) => (
                <LinhaCamera
                  key={camera.id}
                  camera={camera}
                  opcoesVinculo={opcoesVinculo}
                  onAtualizar={(payload) =>
                    atualizar.mutate({ id: camera.id, payload })
                  }
                  onExcluir={() => excluir.mutate(camera.id)}
                  excluindo={excluir.isPending}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
