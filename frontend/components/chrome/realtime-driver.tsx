"use client";

// Motor da simulação da esteira. Montado UMA vez no layout do grupo
// (vision) — sobrevive à navegação e nunca monta em /login ou /estacao.
// Propriedades que mantêm o tick fora do caminho de render:
//  1. getState() em vez de hook com selector — o driver não assina nada;
//  2. cadeia de setTimeout (não setInterval) + guard document.hidden — sem
//     rajada de catch-up em aba de fundo;
//  3. flag de módulo contra o double-mount do StrictMode em dev.

import { useEffect, useRef } from "react";
import { TICK_MS, useRealtime } from "@/lib/stores/realtime";
import { useCheckpoints } from "@/lib/data/use-checkpoints";
import * as api from "@/lib/data/api";

let started = false;

export function RealtimeDriver() {
  const { data: checkpoints } = useCheckpoints();
  const nomesRef = useRef<string[]>([]);

  useEffect(() => {
    nomesRef.current = checkpoints?.map((c) => c.nome) ?? [];
  }, [checkpoints]);

  useEffect(() => {
    if (started) return;
    started = true;
    void api
      .getTransformadores()
      .then((ts) => useRealtime.getState().init(ts));
    let id: ReturnType<typeof setTimeout>;
    const loop = () => {
      id = setTimeout(() => {
        if (!document.hidden)
          useRealtime.getState().tick(nomesRef.current);
        loop();
      }, TICK_MS);
    };
    loop();
    return () => {
      clearTimeout(id);
      started = false;
    };
  }, []);

  return null;
}
