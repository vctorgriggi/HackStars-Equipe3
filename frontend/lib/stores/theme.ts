// Micro-store de tema — só o botão de toggle assina; quem estiliza é o CSS
// via [data-theme]. Escreve atributo + localStorage sincronamente (nunca há
// frame em que os dois divergem). O valor inicial vem do atributo que o
// ThemeScript já resolveu antes do paint.

import { create } from "zustand";

export type Tema = "dark" | "light";

const STORAGE_KEY = "trael-theme";

function temaInicial(): Tema {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

interface ThemeState {
  tema: Tema;
  setTema(tema: Tema): void;
  toggle(): void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  tema: temaInicial(),
  setTema(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    try {
      localStorage.setItem(STORAGE_KEY, tema);
    } catch {
      // modo privado: tema vale só para a sessão
    }
    set({ tema });
  },
  toggle() {
    get().setTema(get().tema === "dark" ? "light" : "dark");
  },
}));
