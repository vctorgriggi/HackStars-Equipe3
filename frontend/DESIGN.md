# DESIGN.md

> Tokens e convenções visuais do `frontend`. A fonte única dos tokens é o
> design system **TRAEL Vision**, vendorizado em `styles/` (tokens CSS) e
> importado por `app/globals.css`; este arquivo documenta o porquê e como
> usar — não duplica valor, referencia o nome do token.

Lido junto com @AGENTS.md no início de toda sessão neste diretório.

## Sistema de tokens (TRAEL Vision)

- `styles/trael-vision.css` importa os tokens (cores, tipografia, espaçamento,
  elevação); `styles/trael-vision.tailwind-v4.css` mapeia-os para utilities
  (`bg-surface-1`, `text-text-2`, `border-line`, `bg-reading-mismatch-soft`,
  `text-sm` = escala do DS, `w-sidebar`, `h-topbar`…). **Nunca converter os
  self-refs `--color-x: var(--color-x)` do `@theme inline` para `@theme`
  plano** — congelaria a paleta dark no build e mataria o light mode.
- **Dark é o default** (`:root`); light entra por `[data-theme="light"]` no
  `<html>`. O atributo é resolvido antes do paint por `app/theme-script.tsx`
  (localStorage `trael-theme`) e alternado por `lib/stores/theme.ts` — nunca
  `prefers-color-scheme`, nunca `useState`+`useEffect` (flash).
- Fontes: Inter + IBM Plex Mono via `next/font/local` (woff2 em `app/fonts/`).
  `.t-mono` (com `tnum`/`zero`) em todo número de série, ID e timestamp;
  `.t-caps` em rótulos/eyebrows.
- Breakpoint do shell: `desk:` = ≥881px (sidebar ↔ navbar inferior). A troca
  de layout é **sempre CSS** — `matchMedia`/`useMediaQuery` no SSR pisca a
  versão desktop no celular. Exceção única: a medição do container do mapa da
  esteira (`tempo-real/_components/use-mapa-layout.ts`), que precisa do scale
  numérico.

## Princípio: mobile-first de verdade

O operador de linha usa o celular no chão de fábrica; o supervisor usa o
desktop. Escrever a classe sem prefixo pensando no celular; `desk:` (e os
`sm:`/`min-[]:` pontuais) só quando a tela realmente muda em desktop.

- **Alvo de toque mínimo 48px** em qualquer elemento tocável (a navbar
  inferior usa 60px).
- **Ação primária de cada tela é `w-full`** no mobile, alto contraste, perto
  do polegar.
- **Coluna única** abaixo de `desk`; as listagens viram cards
  (`components/ui/data-table.tsx` renderiza os dois e o CSS escolhe).

## Cores semânticas

### Vereditos de conformidade (regra de ouro, CLAUDE.md raiz)

O front nunca calcula veredito — só mapeia as 3 strings da API para cor. Os
tokens agora são **aliases** dos reading states do TRAEL Vision (definidos em
`app/globals.css`):

| Veredito (API)   | Token                    | Alias de                    |
| ---------------- | ------------------------ | --------------------------- |
| `conforme`       | `--color-conforme`       | `--color-reading-success`   |
| `divergente`     | `--color-divergente`     | `--color-reading-mismatch`  |
| `nao_conferivel` | `--color-nao-conferivel` | `--color-reading-lowconf`   |

Em código, o mapa é `VEREDITO_TO_READING` (`lib/domain/types.ts`) e o
componente é `StatusChip`/`VerditoChip` — nunca `text-green-600` solto.

### Reading states (status de visão computacional)

`pending | processing | success | lowconf | mismatch | validated`, cada um com
base, `-hc` (overlay de vídeo) e `-soft` (fundo de badge). A fonte única do
pareamento cor↔status é `lib/domain/status.ts` + `components/ui/chip.tsx`.
Nunca reutilizar o verde de marca para "sucesso", nem `--viz-*` para status —
viz é série de gráfico, mesmo quando o hex coincide.

## Base UI + Motion

`@base-ui/react` é a base de qualquer componente com comportamento; `motion`
anima o que comunica mudança de estado. Já aplicado em:

- `Popover` (sino de notificações), `Menu` (avatar), `Select` (filtros e
  vínculo de câmera), `Switch` (toggles), `Slider` (limiar), `Toggle`/
  `ToggleGroup` (chips de campos, pill switcher), `Form`/`Field` (login).
- Popups animam com as `data-[starting-style]`/`data-[ending-style]` do
  próprio Base UI (transições CSS) — sem `motion` para popup.
- `motion` fica para o sprite da esteira (`animate()` imperativo, duração =
  distância/240px/s, ease linear) e entradas do login. Charts animam por CSS
  (`tvGrow`/`tvGrowX` + transição) e respeitam `prefers-reduced-motion` via
  o bloco em `globals.css` (`[data-tv-anim]`, `.tv-*`).

## Convenções de componente

A regra dos 3+ usos disparou com as 12 telas — `components/` existe:

- `components/ui/` — primitivos sem conhecimento de domínio (chip, data-table,
  select, toggle, slider, skeleton, empty-state, section-card, icon…).
- `components/chrome/` — o shell (sidebar, bottom-nav, topbar, sino, avatar,
  theme-toggle, realtime-driver).
- `components/charts/` — os 4 gráficos do dashboard (SVG/CSS puros, sem lib).
- `components/vision/` — componentes de domínio compartilhados entre telas
  (ex.: banner de alertas).
- `app/(vision)/<rota>/_components/` — componentes de UMA tela. Promoção para
  `components/` acontece no **segundo** consumidor, não por antecipação.

Ícones: `components/ui/icon.tsx` (SVGs 24×24 stroke 1.8 do protótipo) — não
adicionar `lucide-react`.

## Dados e estado (resumo; detalhes em lib/)

- Dados de domínio: react-query sobre `lib/data/api.ts` (a costura mock→API).
  Checkpoints têm UMA query (`['checkpoints']`); nomes de etapa são join no
  render — é o que faz rename propagar para mapa/funil/filtros/timeline.
- Esteira: zustand (`lib/stores/realtime.ts`), tick de 2,5s no
  `RealtimeDriver`; selectors de folha retornam primitivos.
- Filtros/período/aba: URL (`searchParams`).
