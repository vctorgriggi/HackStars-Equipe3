import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Handoff de design (protótipo de referência, não código do app):
    "design_handoff_trael_vision/**",
    // Estação de captura: fora do escopo da rodada TRAEL Vision (decisão de
    // 2026-07-26 — tela intocada); os erros de react-hooks/set-state-in-effect
    // são pré-existentes. Remover daqui quando a tela for revisada.
    "app/estacao/**",
  ]),
]);

export default eslintConfig;
