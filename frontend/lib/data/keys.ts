// Fábrica de query keys — única fonte, para invalidação sem string solta.
export const keys = {
  // API real (listagem/detalhe integrados) — sufixo próprio herdado da época
  // em que coexistia com o cache mock de transformadores (já removido).
  transformadoresApi: {
    all: ["transformadores-api"] as const,
    porSerie: (serie: string) => ["transformadores-api", serie] as const,
    passagens: (id: string) =>
      ["transformadores-api", id, "passagens"] as const,
    conferencias: (id: string) =>
      ["transformadores-api", id, "conferencias"] as const,
  },
  etapasLinha: { all: ["etapas-linha"] as const },
  // API real de clientes/projetos/câmeras — sufixo próprio para não colidir
  // com o cache mock abaixo (keys.cameras segue vivo no detalhe de
  // checkpoint, ainda não integrado).
  clientesApi: { all: ["clientes-api"] as const },
  projetosApi: { all: ["projetos-api"] as const },
  camerasApi: { all: ["cameras-api"] as const },
  lotesApi: { all: ["lotes-api"] as const },
  // Compartilhada entre a page do dashboard e o banner de alertas de
  // propósito: mesma key → react-query deduplica, zero request extra.
  indicadoresApi: { all: ["indicadores-api"] as const },
  esteiraApi: { all: ["esteira-api"] as const },
  clientes: { all: ["clientes"] as const },
  projetos: { all: ["projetos"] as const },
  checkpoints: { all: ["checkpoints"] as const },
  cameras: { all: ["cameras"] as const },
  notificacoes: { all: ["notificacoes"] as const },
  config: { all: ["config-notificacoes"] as const },
};
