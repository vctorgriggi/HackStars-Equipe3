# Handoff: TRAEL Vision — Plataforma administrativa de acompanhamento de transformadores

## Overview
Plataforma administrativa mobile-first para acompanhamento de transformadores em linha de montagem com visão computacional. Módulos: Dashboard com KPIs e gráficos, listagens (Transformadores, Clientes, Lotes, Projetos), visualização em tempo real da esteira (WebSocket), módulo de Câmeras (feeds ao vivo + cadastro), módulo de Checkpoints (CRUD das etapas da esteira), Configurações (notificações) e Login.

**Target: Next.js (App Router).** Recomendações de stack no fim deste documento.

## About the Design Files
Os arquivos deste pacote são **referências de design criadas em HTML** — protótipos que mostram aparência e comportamento pretendidos, não código de produção para copiar diretamente. A tarefa é **recriar estas telas em Next.js/React** usando os padrões do repositório de destino. O protótipo inteiro vive em `Plataforma Trael.dc.html` (um componente único com template HTML + classe de lógica JS); o design system está em `_ds/` (tokens CSS + fontes).

## Fidelity
**High-fidelity.** Cores, tipografia, espaçamentos, estados e microinterações são finais. Recriar pixel-perfect usando os tokens listados abaixo (disponíveis como CSS custom properties em `_ds/styles.css`).

## Domain model (entidades)
- **Transformador**: nº de série (`TR-######`), cliente vinculado, potência (kVA), etapa atual (índice do checkpoint), status (`pending | processing | success | lowconf | mismatch`), data prevista de entrega.
- **Checkpoint** (entidade de 1ª classe, módulo próprio): nome, ordem, limiar de confiança (50–100%), ativo (bool), câmeras vinculadas (0..N), campos validados (subconjunto de: Serigrafia, Chassi, Plaqueta, Etiqueta). Seed: Bobinagem, Núcleo, Tanque, Ensaios, Pintura, Expedição (limiares 90/92/90/97/88/95).
- **Câmera** (entidade própria, vínculo N:1 com checkpoint): id (`CAM-##`), endpoint RTSP, online (bool), checkpoint vinculado (opcional). Uma câmera pertence a no máx. 1 checkpoint; vincular em outro move o vínculo.
- **Cliente**: nome, cidade/UF, e-mail, unidades em produção, total entregues.
- **Lote**: id (`LT-AAAA-###`), projeto, nº de transformadores, progresso %, status, previsão.
- **Projeto**: nome, cliente, nº de lotes, nº de transformadores, progresso %, entrega prevista.

**Regra de negócio crítica**: divergência de leitura (mismatch) **para a linha de produção** imediatamente — não existe "fila de revisão". A UI mostra banner de linha parada com botão "Liberar linha". Nomenclatura: nunca usar "trafo"; sempre "transformador(es)".

## Screens / Views

### 1. Login
- Card centrado (max-width 380px) sobre `--bg-canvas`: logomarca (quadrado 52px com `--gradient-brand`), "TRAEL" + "VISION · MONITORAMENTO DE LINHA" em caps.
- Campos E-mail e Senha (altura 48px, `--surface-2`, radius `--radius-md`); erro de validação = borda `--color-reading-mismatch` + mensagem em fundo `--reading-mismatch-soft`.
- Botão primário "Entrar" (48px, `--color-brand-primary`, hover `--color-brand-primary-600`), estado "Entrando…" (~700ms no protótipo), Enter submete. Link "Esqueci minha senha".
- Após login: skeletons (~650ms) e Dashboard.

### 2. Shell / Navegação
- **Desktop (>880px)**: sidebar fixa (largura `--sidebar-w`) com logo e itens: Dashboard, Transformadores, Lotes, Projetos, Clientes, Tempo real, Câmeras, Checkpoints, Configurações. Item ativo: fundo `--brand-surface`, texto `--text-1`; inativo `--text-3`; hover `--surface-2`.
- **Mobile (≤880px)**: **navbar inferior fixa** (não drawer) com 6 itens: Dashboard, Unidades, Lotes, Projetos, Ao vivo, Câmeras (ícone em pill que ganha fundo `--brand-surface` quando ativo; altura mínima do alvo 60px; `padding-bottom: env(safe-area-inset-bottom)`). Checkpoints e Configurações ficam no menu do avatar.
- **Topbar** (sticky, altura `--topbar-h`): título da tela; à direita: sino de notificações (badge vermelho com contagem, painel dropdown com lista e "Marcar todas como lidas"), toggle de tema claro/escuro, avatar "AD" com **dropdown** (nome/cargo, Meu perfil, Checkpoints, Configurações, Alternar tema, Sair). Dropdowns fecham com clique fora (overlay fixed inset-0).
- Tema: atributo `data-theme="dark|light"` no elemento raiz; alternável no app.

### 3. Dashboard
- **Filtro de período**: pill switcher Hoje / 7 dias / 30 dias / Personalizado (este mostra dois `<input type="date">`). Muda KPIs, donut e granularidade do gráfico de barras (por hora / dia / semana).
- **4 KPI cards** (grid `auto-fit minmax(150px,1fr)`): Em produção, Produção do período (+delta verde), Aprovação em ensaios, Tempo médio total. Valor em mono `--text-3xl` bold.
- **4 gráficos** (grid `auto-fit minmax(290px,1fr)`), todos casulos `--surface-1`, borda `--border`, radius `--radius-lg`, shadow `--shadow-1`, padding `--space-4`; título em caps `--text-2xs` `--text-3`:
  - **Produção por dia**: barras verticais (150px de altura útil), barra máxima em `--color-brand-medium`, demais `--viz-1`, radius no topo.
  - **Status por etapa** (funil): 6 linhas com label (82px), barra horizontal 12px em `--viz-1`…`--viz-6`, contagem mono à direita.
  - **Taxa de aprovação**: donut SVG (r=48, stroke 14, `stroke-dasharray` proporcional, track `--viz-track`, arco `--color-reading-success`) com % em overlay HTML centrado (não `<text>` SVG); legenda Aprovados/Reprovados.
  - **Tempo médio por checkpoint**: barras horizontais em `--viz-2`, valor "N,N d".
- **Banner de alertas** (Dashboard e Transformadores) quando existir unidade `mismatch`/`lowconf`: fundo `--reading-mismatch-soft`, ícone triângulo, chips clicáveis por unidade que abrem o detalhe.

### 4. Transformadores (listagem)
- Busca (série/cliente) + selects de Status e Etapa, contador "N unidades".
- Desktop: tabela em grid (`105px 1fr 110px 110px 90px`) — Série (mono), Cliente · kVA, chip de etapa (neutro), chip de status (cores de leitura), entrega (mono); linha clicável (hover `--surface-2`) → detalhe.
- Mobile: cards com os mesmos dados.
- **Estado vazio**: círculo 56px com ícone de lupa, "Nenhum transformador encontrado", texto auxiliar e botão "Limpar filtros".
- Chips de status: fundo `--reading-<st>-soft`, texto `--color-reading-<st>`; labels: Aguardando, Em processo, Aprovado, Atenção, Reprovado.

### 5. Detalhe do transformador
- Botão "‹ Voltar para transformadores".
- Card de info (flex 1 1 260px): série grande + chip de status; pares label/valor (Cliente, Potência, Etapa atual, Entrega prevista); barra de progresso na linha (etapa/6).
- Card timeline (flex 2 1 380px): 6 itens verticais com nó colorido (concluído = verde; atual = cor do status com `--ring-focus-tight`; futuro = `--viz-track`) e linha conectora; cada item tem nome, chip (Concluído/Em processo/Reprovado/Atenção/Aguardando/Previsto), data/hora mono à direita e descrição. Etapas com conferência visual mostram um **cartão de evidência**: thumbnail da foto (84×60), "INSCRIÇÕES CONFERIDAS", chips mono com série e kVA e selo verde "Leitura confirmada".

### 6. Clientes
- Desktop: grid `1fr 220px 110px 110px` — avatar de iniciais (34px, `--brand-surface`), nome + cidade, e-mail mono, Em produção, Entregues.
- Mobile: cards com avatar 40px e contagem "ativos" à direita.

### 7. Lotes
- Desktop: grid `100px minmax(110px,1fr) 62px minmax(90px,1fr) 100px 78px` — Lote (mono), Projeto, Unidades, barra de progresso + %, chip de status, previsão.
- Mobile: cards. Status usa mapa próprio: Aguardando/Em produção/Atenção/Concluído.

### 8. Projetos
- Desktop: grid `minmax(120px,1.2fr) minmax(100px,1fr) 44px 62px minmax(84px,1fr) 66px` — Projeto, Cliente, Lotes, Unidades, progresso, entrega.
- Mobile: cards.

### 9. Tempo real (esteira)
- Header: dot verde pulsante "Conectado" + endpoint `ws://linha-1.trael/stream` (mono) + contagem "na esteira".
- **Mapa da esteira** (card com scroll interno): layout serpentina desenhado em coordenadas absolutas num canvas lógico de **760×448px**, com `transform: scale()` para caber no container (scale = clientWidth/760, máx 1).
  - 6 **checkpoints** = quadrados 130×92px (`--surface-2`, borda `--border`; borda/anel da cor de leitura quando "hot"): nome em caps, contagem grande mono de unidades na etapa, dot de status.
  - Posições desktop: (20,20) (610,20) (610,180) (170,180) (170,336) (610,336). **Segmentos de esteira** ligando-os: retângulos 28px de espessura com listras animadas (`repeating-linear-gradient` branco translúcido `.28`/`.10` sobre `--surface-inset` — mesmas cores nos dois temas) rolando na direção do fluxo (keyframes `tvBelt`/`tvBeltR`/`tvBeltV`, 1.6s linear infinite).
  - **Abaixo de 600px de container**: layout vertical alternativo (canvas 320×824), checkpoints empilhados na coluna com segmentos verticais entre eles.
  - **Animação de transição**: quando uma unidade muda de checkpoint, um sprite (imagem do transformador + tag mono da série) viaja do centro do checkpoint origem ao destino com `transition: left/top` **linear** e duração = distância ÷ 240px/s (velocidade constante). O checkpoint destino acende ("hot") durante a chegada.
- **Painel lateral** (320px; empilha no mobile): card "Selecionado" ao clicar num checkpoint (série, cliente, kVA, etapa, status, Fechar) + **feed de eventos ao vivo** (dot colorido, mensagem, hora mono · série; máx ~14 itens, novos no topo).
- **Simulação WebSocket** (substituir por WS real): tick a cada `intervaloSim` (default 2,5s) move uma unidade aleatória; no checkpoint Ensaios há ~18% de chance de reprovar e voltar ao Tanque; unidade que sai de Expedição é expedida e uma nova série entra na Bobinagem.

### 10. Câmeras (módulo, 2 abas em pill switcher)
- **Ao vivo**: banner de **linha parada** quando houver mismatch (fundo soft vermelho, dot pulsante, descrição com série, botão primário "Liberar linha"); 4 mini-KPIs (Câmeras online X/Y, Leituras hoje, Validação automática %, Paradas de linha hoje); grupos por checkpoint, cada câmera = card com feed 16:9 (imagem + scrim), bounding box 2px na cor `--color-reading-<st>-hc`, chip do id com dot REC pulsante, chip "série · confiança%", rodapé com status textual. Câmera offline: box/status cinza "Câmera offline". Checkpoint sem câmera: aviso tracejado "Nenhuma câmera vinculada… vincule em Câmeras › Cadastro".
- **Cadastro**: botão "+ Nova câmera"; lista com id mono, endpoint RTSP mono, dot online/offline, **select de vínculo ao checkpoint** ("Sem vínculo" + etapas). Vincular remove o vínculo anterior automaticamente.

### 11. Checkpoints (módulo)
- Lista ordenada: badge de ordem (01–06), nome + câmeras (mono), chips dos campos validados, limiar %, toggle ativo/inativo (linha inativa: opacity .5). Linha clicável → detalhe. Botão "+ Nova etapa".
- **Detalhe do checkpoint** (2 cards): (1) Nome (input), Limiar de confiança (slider 50–100 com valor grande mono e legendas "permissivo/rígido"), toggle "Etapa ativa — Inativa: a esteira pula este checkpoint". (2) Câmeras vinculadas (lista com dot online e ✕ para desvincular; chips tracejados "+ CAM-XX" para vincular as livres; se não houver livres, mensagem apontando para o cadastro) e Campos validados (chips-toggle Serigrafia/Chassi/Plaqueta/Etiqueta; selecionado = `--brand-surface` + `--brand-surface-border`). Edições refletem em todo o app (nomes de etapa no mapa, funil, filtros, timeline).

### 12. Configurações
- Só preferências da aplicação: lista "Notificações" com 4 toggles (Parada de linha, Divergência de leitura, Resumo diário, Entregas próximas), cada um com título + descrição.
- Toggle pattern: 40×22px pill, thumb 16px branco, ligado = `--color-brand-medium`, desligado = `--surface-3`, transição .3s.

## Interactions & Behavior
- Navegação por estado de tab única (SPA); em Next.js usar rotas (`/dashboard`, `/transformadores`, `/transformadores/[serie]`, `/clientes`, `/lotes`, `/projetos`, `/tempo-real`, `/cameras`, `/checkpoints`, `/checkpoints/[id]`, `/configuracoes`, `/login`).
- **Lazy loading**: cada troca de tela mostra skeletons com shimmer (`@keyframes` opacity .55→1→.55, 1.4s) por ~650ms no protótipo — em produção, durante o fetch real (React Suspense + `loading.tsx`).
- Hovers: linhas de tabela e itens de menu → `--surface-2`; botões primários → `--color-brand-primary-600`; ícones circulares do topo → `--surface-3`.
- Transições: barras de progresso `width .6s`; pills de nav `background .3s`; sprite da esteira `left/top linear` (duração calculada); toggles `.3s`.
- Easing padrão: `--ease-standard`.
- Breakpoint móvel: `max-width: 880px` (via matchMedia no protótipo; usar CSS/container queries em produção). Mapa da esteira: modo vertical < 600px de container.

## State Management
- `tab/rota`, `tema`, sessão (logado), busca + filtros (status, etapa), período do dashboard (+ datas custom), transformador selecionado, checkpoint em edição, view de câmeras (live/reg), notificações (lidas), linha parada (bool), unidades na esteira (`{serie, stage}[]`), feed de eventos, dados de checkpoints e câmeras (editáveis).
- Tempo real: WebSocket com eventos tipo `{serie, from, to, status, timestamp}`; reconciliar unidades e prepend no feed. Reproduzir a regra: mismatch ⇒ linha parada até liberação manual.

## Design Tokens
Fonte da verdade: `_ds/styles.css` (CSS custom properties, temas dark/light via `[data-theme]`). Principais:
- Superfícies: `--bg-canvas`, `--surface-1` (cards), `--surface-2`, `--surface-3`, `--surface-inset` (poço da esteira, escuro nos 2 temas), `--border`, `--border-strong`.
- Texto: `--text-1`, `--text-2`, `--text-3`; fontes: display/corpo + `IBM Plex Mono` (classe `t-mono`) para números, séries, ids; classe `t-caps` para labels em caps.
- Marca: `--color-brand-primary` (+ `-600`), `--color-brand-medium`, `--color-brand-on`, `--brand-surface`, `--brand-surface-border`, `--gradient-brand`.
- Leitura (status de visão computacional): `--color-reading-{pending|processing|success|lowconf|mismatch}` + variantes `-hc` (alto contraste p/ overlays de vídeo) + fundos `--reading-<st>-soft`.
- Viz: `--viz-1`…`--viz-6`, `--viz-track`.
- Espaço/forma: escala `--space-1..16`; `--radius-{xs,sm,md,lg,pill}`; `--shadow-{1,2,3,inset,pop}`; `--ring-focus`, `--ring-focus-tight`; tipografia `--text-{2xs..3xl}`; pesos `--weight-{medium,semibold,bold}`; `--sidebar-w`, `--topbar-h`, `--row-h`.
- Overlays de vídeo: `--overlay-scrim`, `--overlay-chip-bg`.

## Assets
- `uploads/pasted-1785043106924-0.png` — foto da esteira (usada como fundo dos feeds de câmera).
- `uploads/pasted-1785043146111-0.png` — foto do transformador (sprite da esteira e evidência na timeline). Substituir por feeds/fotos reais.
- Ícones: SVGs inline stroke 1.8, 24×24 (grid, cubo, pessoas, atividade, câmera, nós, engrenagem, sino, logout). Em Next.js, `lucide-react` cobre todos.
- Fontes em `_ds/fonts/` com `fonts.css`.

## Files
- `Plataforma Trael.dc.html` — protótipo completo (template + lógica). Referência canônica de layout, copy e comportamento.
- `_ds/` — design system: `styles.css` (tokens), `fonts/`, `_ds_bundle.css`/`_ds_bundle.js` (componentes utilitários do protótipo).

## Next.js — recomendações
- App Router + TypeScript; rotas acima; `loading.tsx` por rota para os skeletons.
- Estilo: importar `_ds/styles.css` global e mapear tokens (ou portá-los para Tailwind v4 `@theme`). Manter `data-theme` no `<html>` com persistência (cookie/localStorage) via provider.
- Tempo real: WebSocket nativo ou socket.io; estado com Zustand ou React Query (para listas) + store leve para a esteira.
- Animação da esteira: manter CSS transitions (left/top lineares com duração = distância/240px/s) ou Framer Motion (`animate` com `duration` calculada).
- Auth: NextAuth/Auth.js; middleware protegendo tudo exceto `/login`.
- Gráficos: os do dashboard são simples — HTML/CSS + SVG puro como no protótipo evita dependência; Recharts se preferirem.
