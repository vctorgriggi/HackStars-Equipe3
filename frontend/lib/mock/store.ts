// Singleton mutável em memória para as fatias que o app EDITA (checkpoints,
// câmeras, notificações, config), com rehydrate de localStorage. Some quando
// a API real existir — nada fora de lib/data/api.ts pode importar daqui.

import type {
  Camera,
  Checkpoint,
  ConfigNotificacoes,
  Notificacao,
} from "@/lib/domain/types";
import { CAMERAS_SEED } from "./seed/cameras";
import { CHECKPOINTS_SEED } from "./seed/checkpoints";
import { CONFIG_SEED } from "./seed/config";
import { NOTIFICACOES_SEED } from "./seed/notificacoes";

interface MockState {
  checkpoints: Checkpoint[];
  cameras: Camera[];
  notificacoes: Notificacao[];
  config: ConfigNotificacoes;
}

const STORAGE_KEY = "trael-vision:mock:v1";

let state: MockState | null = null;

function clonar<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function carregar(): MockState {
  const seed: MockState = {
    checkpoints: clonar(CHECKPOINTS_SEED),
    cameras: clonar(CAMERAS_SEED),
    notificacoes: clonar(NOTIFICACOES_SEED),
    config: clonar(CONFIG_SEED),
  };
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const salvo = JSON.parse(raw) as Partial<MockState>;
    // Merge raso por fatia: fatia ausente/corrompida cai no seed.
    return {
      checkpoints: Array.isArray(salvo.checkpoints)
        ? (salvo.checkpoints as Checkpoint[])
        : seed.checkpoints,
      cameras: Array.isArray(salvo.cameras)
        ? (salvo.cameras as Camera[])
        : seed.cameras,
      notificacoes: Array.isArray(salvo.notificacoes)
        ? (salvo.notificacoes as Notificacao[])
        : seed.notificacoes,
      config: salvo.config
        ? { ...seed.config, ...salvo.config }
        : seed.config,
    };
  } catch {
    return seed;
  }
}

export function getMockState(): MockState {
  if (!state) state = carregar();
  return state;
}

export function persistMockState(): void {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota/modo privado: mock segue só em memória
  }
}
