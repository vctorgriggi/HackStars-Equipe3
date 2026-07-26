// Fábrica de query keys — única fonte, para invalidação sem string solta.
export const keys = {
  transformadores: {
    all: ["transformadores"] as const,
    one: (serie: string) => ["transformadores", serie] as const,
    timeline: (serie: string) => ["transformadores", serie, "timeline"] as const,
  },
  clientes: { all: ["clientes"] as const },
  lotes: { all: ["lotes"] as const },
  projetos: { all: ["projetos"] as const },
  checkpoints: { all: ["checkpoints"] as const },
  cameras: { all: ["cameras"] as const },
  notificacoes: { all: ["notificacoes"] as const },
  config: { all: ["config-notificacoes"] as const },
  dashboard: (periodo: string, de?: string, ate?: string) =>
    ["dashboard", periodo, de ?? "", ate ?? ""] as const,
};
