# PLAN.md

> Plano de execução do sistema de conferência TRAEL (SPEC.md), fatiado em fases
> pequenas e revisáveis, na ordem que a arquitetura pede: lógica pura testada
> primeiro (engine de comparação, sem dependência externa), a borda mais frágil
> (visão/OCR) logo em seguida com spike antes de compromisso, UI quando já há o
> que mostrar, trânsito depois do core da demo, e os Could por último, como
> fase opcional.

## Convenções

- Cada task tem: um id (ex.: T2.1), o módulo responsável (coerente com a
  estrutura do CLAUDE.md), os testes TDD que a definem ou a verificação manual
  que a define, e os critérios de aceitação.
- Uma fase só começa quando todos os checkboxes da anterior estão marcados,
  exceto fases marcadas como opcionais, que podem ser puladas.
- Toda borda externa (visão AWS, storage) entra atrás de uma porta mockável;
  a engine de conformidade nunca importa SDK.
- Desvios são registrados na própria tarefa: o que mudou e por quê ficam no
  texto dela.

## Fase 0 — Fundação

Objetivo: backend e frontend rodando localmente, banco migrado com as
entidades do SPEC.
Depende de: nada.

- [x] T0.1 — Verificar o scaffold NestJS do backend · módulo: backend (raiz)
  - Desvio: o scaffold já veio do time (commit 485df7a, boilerplate brocoders
    em `backend/`); resta a verificação.
  - Verificação: `npm run start:dev` sobe; healthcheck responde; PostgreSQL via
    docker compose. Feito em 2026-07-25: `GET /` responde 200; migrations e
    seeds base do boilerplate rodados; login do admin seed funciona.
  - Aceitação: `backend/` rodando limpo, sem código morto de features do
    boilerplate que não usamos (não gastar tempo removendo — apenas não usar).
- [x] T0.2 — Verificar o scaffold Next.js do frontend · módulo: frontend
  - Desvio: substituiu o scaffold Angular do plano original — o time já subiu
    Next.js 16 (commit 239bd53); docs atualizados em 2026-07-25.
  - Verificação: `npm run dev` serve o app no celular da rede local; chamada ao
    healthcheck do backend funciona. Feito em 2026-07-25: `/conferencia`
    responde 200 e exibe status da API (CORS ok); URL de rede disponível para
    o celular.
  - Aceitação: `frontend/` rodando com uma rota placeholder de conferência.
- [x] T0.3 — Entidades e migrations · módulo: transformadores (+ conformidade, evidencias, transito)
  - Desvio: entidades criadas pelos generators do boilerplate (recipe em
    backend/CLAUDE.md); nomes de pasta ficaram como o gerador pluraliza
    (transformadors, campo-conferidos, evento-passagems) — não vale brigar
    com o hygen. Mapa conceito → pasta real no CLAUDE.md raiz.
  - Verificação: migration roda limpa em banco vazio; tabelas conforme SPEC
    (Entidades). Feito em 2026-07-25: 7 tabelas no Postgres (incl.
    projeto_modelo); GET /api/v1/checkpoints (com JWT do admin seed) devolve
    as etapas seedadas.
  - Desvio (auditoria 2026-07-25, agentes Opus): vereditos ficaram legíveis
    nas respostas (o @Exclude gerado os escondia) e fora dos DTOs de escrita;
    unique em numeroSerie/codigo; confianca virou double precision; Checkpoint
    ganhou codigo (slug de gate); seeds viraram upsert por codigo; checklist
    do seed alinhada ao critério 1 (migration AjustesAuditoria).
  - Aceitação: seed com as etapas reais da linha, ordenadas (adesivação/
    separação da etiqueta, serigrafia, enchimento de óleo e conferência,
    fixação da placa); Checkpoint carrega a posição na sequência desde a
    primeira migration.

## Fase 1 — Núcleo de conformidade (TDD)

Objetivo: engine de comparação pura testada, sem tocar AWS.
Depende de: Fase 0 completa.

- [x] T1.1 — Decodificar QR real e fixar o parser do payload · módulo: transformadores
  - Testes (primeiro): payload real → campos esperados (série, patrimônio,
    pedido, seq, cliente); payload inválido → erro claro.
  - Feito em 2026-07-25 (agente Opus, TDD): parser em
    `transformadors/qr/` com 26 testes — formatos JSON (com aliases),
    chave:valor (acentos normalizados) e código de lookup; fixture simulando a
    etiqueta real; erros tipados (`PayloadInvalidoError`).
  - Desvio: o QR físico ainda não foi decodificado — a decisão em aberto do
    formato SEGUE ABERTA; o parser cobre os formatos prováveis e o payload
    só-código responde 422 no endpoint (fallback de digitação manual é da
    Fase 3, T3.1).
- [x] T1.2 — Engine de comparação campo a campo · módulo: conformidade
  - Testes (primeiro): campo igual → `conforme`; diferente → `divergente`;
    confiança abaixo do limiar ou leitura ausente → `nao_conferivel`; agregação
    do veredito geral na precedência divergente > nao_conferivel > conforme;
    caso da peça de demo (847233 × 847833) acusando só a série da placa.
  - Feito em 2026-07-25 (agente Opus, TDD): `conferir()` pura em
    `conferencia/engine/` com 39 testes, incluindo o teste-âncora. Regras
    extras fixadas: valor igual com confiança baixa NUNCA vira conforme;
    opcional `nao_conferivel` não bloqueia o conforme geral; opcional sem
    valor esperado é omitido do resultado.
  - Aceitação: engine é função pura (valores esperados + leituras com
    confiança → vereditos); zero imports de I/O ou SDK. A lista de campos a
    conferir é parâmetro de entrada, nunca constante — o chamador a carrega do
    ProjetoModelo da peça (seedado com o modelo da demo na Fase 0).
- [x] T1.3 — Endpoints de conferência com leituras mockadas · módulo: conformidade
  - Verificação: criar conferência via curl com leituras simuladas e receber
    vereditos campo a campo persistidos. Feito em 2026-07-25 (agente Opus +
    verificação do orquestrador): `POST /api/v1/conferencia/executar` → 201
    com veredito divergente só em serie-placa, 7 campos persistidos com
    veredito e confiança; POST repetido não duplica transformador; 422 para
    payload inválido/só-código/etapa inexistente.
  - Aceitação: contrato request/response estável para a Fase 3 consumir;
    Transformador resolvido por find-or-create com `numeroSerie` como chave
    (patrimônio não é único entre clientes — SPEC, decisões em aberto).
  - Desvios: checkpoint resolvido ANTES de qualquer escrita (etapa inválida
    não deixa transformador órfão); codigoProjeto do QR sem cadastro não é
    erro — cai para vínculo da peça → projeto único do banco; escrita de
    veredito só por `CampoConferidosService.criarComVeredito` (server-side,
    sem rota HTTP); `forwardRef` nos módulos conferencia ↔ campo-conferidos;
    colunas NOT NULL recebem `''` quando o valor não existe (valorEsperado de
    campo sem esperado; cliente de etiqueta sem cliente) — sentinela a revisar
    se algum dia virar filtro de consulta.

## Fase 2 — Extração por visão

Objetivo: fotos reais → campos com confiança e evidência.
Depende de: Fase 1 completa.

- [ ] T2.1 — Spike Textract vs Bedrock com as fotos reais · módulo: extracao
  - Verificação: tabela de acerto por fonte física (placa, serigrafia, série
    chumbada) para cada serviço; timebox de 2h. Incluir no timebox um prompt
    de check qualitativo de layout via Bedrock (marcações presentes e na
    disposição do projeto da demo) — decide se o Could de layout entra.
  - Bloqueio externo (2026-07-25): aguarda credenciais AWS no backend/.env
    (checklist em docs/aws.md) e fotos da peça em arquivo. O executável do
    spike já existe: `npx ts-node -r tsconfig-paths/register
    scripts/spike-extracao.ts <dir-fotos>` — roda os dois adapters e imprime
    o placar de acerto. Desvio autorizado: a Fase 3 pode iniciar em modo mock
    (EXTRACTOR_DRIVER=mock) sem esperar este item — bloqueio é externo ao
    time e o mock espelha o cenário-âncora da demo.
  - Aceitação: escolha registrada como decisão resolvida aqui e no CLAUDE.md;
    se render aprendizado caro (prompts, pré-processamento), vira
    docs/visao-ocr.md.
- [x] T2.2 — ExtractorPort e adapter do serviço escolhido · módulo: extracao
  - Testes (primeiro): consumidores da porta testados com mock; adapter real
    verificado manualmente com as fotos da demo.
  - Feito em 2026-07-25 (agente Opus): módulo `extracao/` com ExtractorPort,
    adapters textract/bedrock/mock e factory por env EXTRACTOR_DRIVER (mock
    default — sistema funcional sem AWS); 31 testes novos (96 no total).
    Verificação com fotos reais fica no T2.1 (bloqueado externamente).
  - Desvios: os DOIS adapters foram implementados (a escolha do spike vira
    troca de env, não código novo); heurística do Textract extraída como
    função pura testável (`interpretarBlocos`); ambiguidade numérica (série ×
    patrimônio sem rótulo) devolve null em vez de chutar — preferir
    nao_conferivel a divergente falso; Bedrock com thinking desligado e
    instrução anti-vazamento de tags (max_tokens 1024 limitaria
    thinking+resposta); mock default espelha a peça de demo (chumbadas
    847233, placa 847833).
  - Aceitação: entrada imagem + tipo de fonte física → saída lista de campos
    com valor, confiança, bounding box (`regiaoLeitura`, quando o serviço
    fornecer) e vínculo à foto; nenhuma chamada AWS fora do adapter.
- [x] T2.3 — Upload de fotos e storage S3 · módulo: evidencias
  - Verificação: foto sobe pelo endpoint, URL (assinada) abre no navegador.
    Feito em 2026-07-25 (agente Opus): POST /foto-evidencia/upload multipart
    com fonteFisica validada por whitelist canônica (422 fora dela), url
    fetchável sem auth via rota de files do boilerplate, vínculo opcional a
    conferência validado; driver local ativo, S3 = troca de FILE_DRIVER.
  - Desvios: interceptor limpa arquivo órfão quando a validação falha após o
    multer gravar; filtro por mimetype (não extensão) para aceitar HEIC de
    iPhone; fonte única dos valores de fonteFisica reconciliada na união
    literal de extracao/ports (satisfies quebra o build se divergir).
  - Aceitação: FotoEvidencia persistida e vinculável a CampoConferido; plano B
    registrado: storage em disco local se S3 atrasar a demo (constraint 1).

## Fase 3 — Fluxo de conferência ponta a ponta

Objetivo: critérios de aceitação 1–4 do SPEC passando com a peça de demo.
Depende de: Fase 2 completa.

- [ ] T3.1 — Leitura do QR no navegador do celular · módulo: frontend
  - Verificação manual: ler a etiqueta real da peça de demo no celular;
    payload decodificado aparece como valores esperados.
  - Aceitação: falha de leitura tem caminho de recuperação (reler ou digitar,
    conforme T1.1). A tela aceita `?etapa=<codigo>` na URL: cada celular
    simula a câmera de uma etapa (SPEC, Must).
- [ ] T3.2 — Captura/upload de fotos e disparo da conferência · módulo: frontend
  - Verificação manual: fotografar as fontes físicas, enviar, conferência
    criada na API (chamadas de visão só neste disparo — constraint 4); com
    dois celulares em URLs de etapas diferentes, cada conferência nasce
    vinculada à etapa certa.
  - Aceitação: operador consegue completar o fluxo sem instrução externa;
    conferência herda o checkpoint da URL quando presente.
- [ ] T3.3 — Tela de veredito campo a campo com evidências · módulo: frontend
  - Verificação manual: roteiro dos critérios 1, 2, 3 e 4 do SPEC executado com
    a peça de demo, na sequência, sem intervenção no banco.
  - Aceitação: critérios 1–4 passam; divergência visualmente inconfundível.

## Fase 4 — Rastreabilidade de trânsito e alerta

Objetivo: critérios de aceitação 5 e 6 do SPEC passando.
Depende de: Fase 3 completa.

- [ ] T4.1 — EventoPassagem via scan de QR no checkpoint · módulo: transito (+ frontend)
  - Verificação manual: selecionar checkpoint, ler QR, evento criado com
    timestamp.
  - Aceitação: scans repetidos no mesmo checkpoint não corrompem o histórico
    (eventos distintos, ordenados).
- [ ] T4.2 — Tela de histórico da peça · módulo: frontend
  - Verificação manual: critério 5 do SPEC executado ponta a ponta.
  - Aceitação: histórico em ordem cronológica com nome do checkpoint e hora.
- [ ] T4.3 — Alerta de divergência · módulo: conformidade (+ frontend)
  - Desvio: promovido da Fase 5 — alerta virou Should porque divergência para
    a produção até correção (2026-07-25).
  - Verificação manual: critério 6 do SPEC executado ponta a ponta.
  - Aceitação: alerta inconfundível fora da tela de veredito e no scan em
    checkpoint de peça divergente.

## Fase 5 (opcional) — Dashboard e indicadores

Objetivo: os Could do SPEC, somente se sobrar tempo antes da demo.
Depende de: Fase 4 completa; pode ser pulada.

- [ ] T5.1 — Dashboard de linha · módulo: frontend (+ transito)
  - Verificação manual: lista peças × último checkpoint × status de
    conformidade, coerente com o banco.
- [ ] T5.2 — Indicadores de auditoria · módulo: conformidade (+ frontend)
  - Verificação manual: contagem de divergências por etapa e por campo bate
    com o banco em um cenário montado à mão.

## Fase 6 (opcional) — Ingestão do projeto

Objetivo: o Could de ingestão do SPEC — subir um PDF de projeto e sair com um
ProjetoModelo aprovado, sem transcrição manual.
Depende de: Fase 3 completa (adapter Bedrock existente); pode ser pulada;
concorre com a Fase 5 pelo tempo restante — priorizar a que render mais na
demo.

- [ ] T6.1 — Upload do PDF e extração da checklist via Bedrock · módulo: extracao (+ projeto-modelos)
  - Verificação manual: subir o EPT-163-PI-676 e comparar a checklist extraída
    com a seedada na Fase 0 (gabarito conhecido).
  - Aceitação: proposta de checklist com campo, fonte física e obrigatoriedade;
    nunca cria ProjetoModelo direto — sempre passa pela revisão (T6.2).
- [ ] T6.2 — Tela de revisão e aprovação da checklist · módulo: frontend (+ projeto-modelos)
  - Verificação manual: editar um item extraído errado e aprovar; ProjetoModelo
    criado reflete a edição.
  - Aceitação: aprovação é por modelo (uma vez), não por peça — checklist
    errada aprovada às cegas corromperia todas as conferências do modelo.

## Riscos e dependências

- **Série chumbada ilegível para OCR** (SPEC, constraint 2) → T2.1 decide o
  serviço; plano B: Bedrock com modelo de visão; plano C: campo
  `nao_conferivel` com foto para conferência humana — a demo continua válida
  pelo critério 4.
- **Prazo de 2 dias** (SPEC, constraint 1) → Fase 5 opcional; T2.3 com fallback
  de disco local; corte na ordem Could → Should, nunca no Must.
- **Payload do QR desconhecido** (SPEC, constraint 5) → T1.1 na frente de tudo
  que depende dele; plano B: digitação manual dos valores esperados.
- **Créditos AWS** (SPEC, constraint 4) → visão só sob disparo explícito
  (T3.2); spike com timebox (T2.1).

## Decisões em aberto

- [ ] **Política para campo parcialmente legível** — rejeitar sempre ou
      similaridade ≥ N% com revisão humana; afeta T1.2.
- [ ] **Formato do payload do QR** — campos embutidos ou código de lookup;
      afeta T1.1 e T3.1.
- [ ] **Textract vs Bedrock para extração** — resolver em T2.1 com as fotos
      reais; afeta T2.2.
- [x] **Framework do front** — resolvido: Next.js 16, scaffold já subido pelo
      time venceu o Angular combinado; T0.2 virou verificação e o módulo `web`
      passou a `frontend` (2026-07-25).
- [x] **Prioridade do alerta de divergência** — resolvido: T5.2 promovida a
      T4.3 (Could → Should); divergência para a produção até correção
      (2026-07-25).
- [x] **Checklist hardcoded × projeto como dado** — resolvido: entidade
      ProjetoModelo criada e seedada na Fase 0 (modelo da demo); engine lê a
      checklist do banco desde a T1.2; ingestão automática do PDF virou Fase 6
      opcional (2026-07-25).

<!-- rodada: nucleo @ 3472869 -->
