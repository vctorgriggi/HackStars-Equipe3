/** TRAEL Vision — tokens como constantes TS (para uso em JS: charts, canvas, overlays).
 * Para estilização de UI prefira as CSS variables (respondem ao tema). Estes valores
 * são os literais do tema ESCURO (padrão) + marca (independente de tema). */
export const brand = {
  primary: '#006536',
  primary600: '#00542d',
  primary700: '#013f22',
  medium: '#5AA646',
  accent: '#8FC73E',
  ink: '#04120a',
  on: '#ffffff',
  gradient: 'linear-gradient(100deg, #006536 0%, #2f8a46 55%, #5AA646 100%)',
} as const;

/** Estados de leitura — NUNCA usar brand.primary como "sucesso". */
export const reading = {
  pending:    { base: '#64748b', hc: '#94a3b8' },
  processing: { base: '#2f81f7', hc: '#4c9dff' },
  success:    { base: '#8FC73E', hc: '#b7f24a' },
  lowconf:    { base: '#e0a12b', hc: '#ffc247' },
  mismatch:   { base: '#e5484d', hc: '#ff6166' },
  validated:  { base: '#9a6bf0', hc: '#b98cff' },
} as const;

export type ReadingState = keyof typeof reading;

export const viz = ['#2f81f7', '#8FC73E', '#e0a12b', '#9a6bf0', '#37c0b4', '#e5484d'] as const;

export const fonts = {
  sans: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
  /** aplicar em números de série / IDs / timestamps */
  monoFeatures: '"tnum" 1, "zero" 1, "ss01" 1, "cv01" 1',
} as const;

export const layout = {
  sidebarW: 248, sidebarWCollapsed: 60, topbarH: 52, rowH: 40,
  controlSm: 24, controlMd: 30, controlLg: 36,
} as const;

export const motion = {
  easeStandard: 'cubic-bezier(0.2, 0, 0, 1)',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  durFast: 90, durBase: 150, durSlow: 240,
} as const;
