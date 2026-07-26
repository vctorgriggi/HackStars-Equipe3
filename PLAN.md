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
    com o hygen. Mapa conceito → pasta real no CLAUDE.md raiz. (Pastas e rotas
    renomeadas para o plural correto do português na rodada nomes-pt,
    2026-07-25; EventoPassagem virou Passagem.)
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
    `transformadores/qr/` com 26 testes — formatos JSON (com aliases),
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
    `conferencias/engine/` com 39 testes, incluindo o teste-âncora. Regras
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
    verificação do orquestrador): `POST /api/v1/conferencias/executar` → 201
    com veredito divergente só em serie-placa, 7 campos persistidos com
    veredito e confiança; POST repetido não duplica transformador; 422 para
    payload inválido/só-código/etapa inexistente.
  - Aceitação: contrato request/response estável para a Fase 3 consumir;
    Transformador resolvido por find-or-create com `numeroSerie` como chave
    (patrimônio não é único entre clientes — SPEC, decisões em aberto).
  - Desvios: checkpoint resolvido ANTES de qualquer escrita (etapa inválida
    não deixa transformador órfão); codigoProjeto do QR sem cadastro não é
    erro — cai para vínculo da peça → projeto único do banco; escrita de
    veredito só por `CamposConferidosService.criarComVeredito` (server-side,
    sem rota HTTP); `forwardRef` nos módulos conferencias ↔ campos-conferidos;
    colunas NOT NULL recebem `''` quando o valor não existe (valorEsperado de
    campo sem esperado; cliente de etiqueta sem cliente) — sentinela a revisar
    se algum dia virar filtro de consulta.

## Fase 2 — Extração por visão

Objetivo: fotos reais → campos com confiança e evidência.
Depende de: Fase 1 completa.

- [x] T2.1 — Spike Textract vs Bedrock com as fotos reais · módulo: extracao
  - Verificação: tabela de acerto por fonte física (placa, serigrafia, série
    chumbada) para cada serviço; timebox de 2h. Incluir no timebox um prompt
    de check qualitativo de layout via Bedrock (marcações presentes e na
    disposição do projeto da demo) — decide se o Could de layout entra.
  - Bloqueio externo (histórico do dia, ENCERRADO na noite de 2026-07-25): o
    Bedrock ficou o dia inteiro inacessível — cotas de inferência Claude
    zeradas (4 pedidos PENDING no Service Quotas) e invoke negado —, enquanto
    S3 e Textract já funcionavam; o spike seguiu com Textract e a Fase 3 foi
    liberada a iniciar em modo mock (EXTRACTOR_DRIVER=mock). O bloqueio caiu
    à noite (a conta liberou os modelos Amazon Nova), e o que a medição então
    possível mostrou está no T2.1 abaixo: Bedrock REPROVADO para leitura
    numérica. Executável: `npx ts-node -r tsconfig-paths/register
    scripts/spike-extracao.ts <dir-fotos>`.
  - Feito em 2026-07-25 com as fotos reais da peça (fotos-demo/): TEXTRACT
    ESCOLHIDO — leu placa 847833 (99,8%), chumbado 847233 (99,9% de cima,
    85,8% de lado), serigrafia 251328/energisa (97-99%) e a etiqueta (100%).
    Medição e aprendizados em docs/visao-ocr.md.
  - Desvio: a constraint 2 do SPEC (relevo derrubaria OCR clássico) NÃO se
    confirmou — Bedrock deixou de ser pré-requisito.
  - Reavaliação do Bedrock (2026-07-25, noite): com a conta destravada (só
    modelos Amazon Nova; os Claude 3 estão bloqueados como "legacy" por
    desuso), o Bedrock foi medido contra o mesmo gabarito e REPROVADO para
    leitura numérica — o Nova Lite inventou o patrimônio como `847233`, que é
    o número de série real da peça, onde o Textract devolveu null. Alucinação
    plausível é falso OK, o bug mais caro do domínio; e LLM não devolve
    confiança calibrada, que a regra de ouro exige por leitura. Não é mais
    "reforço opcional para foto ruim": fica FORA do caminho de leitura, e
    segue candidato só ao check qualitativo de layout (Could do SPEC), onde
    não há concorrente OCR. O adapter permanece no código atrás da porta.
    Medição em docs/visao-ocr.md.
  - Aceitação: escolha registrada como decisão resolvida aqui e no CLAUDE.md;
    aprendizado caro registrado em docs/visao-ocr.md.
- [x] T2.2 — ExtractorPort e adapter do serviço escolhido · módulo: extracao
  - Testes (primeiro): consumidores da porta testados com mock; adapter real
    verificado manualmente com as fotos da demo.
  - Feito em 2026-07-25 (agente Opus): módulo `extracao/` com ExtractorPort,
    adapters textract/bedrock/mock e factory por env EXTRACTOR_DRIVER (mock
    default — sistema funcional sem AWS); 31 testes novos (96 no total).
    Verificação com fotos reais fica no T2.1 (bloqueado externamente quando
    esta tarefa fechou; concluído no mesmo dia).
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
    Feito em 2026-07-25 (agente Opus): POST /fotos-evidencia/upload multipart
    com fonteFisica validada por whitelist canônica (422 fora dela), url
    fetchável sem auth via rota de files do boilerplate, vínculo opcional a
    conferência validado; driver local ativo, S3 = troca de FILE_DRIVER.
    Atualização 2026-07-25: S3 LIGADO e verificado (bucket trael, URL
    assinada 200); `TransformUrlEvidencia` devolve URL pronta nos dois
    drivers (local → absoluta, s3 → assinada 1h).
  - Desvios: interceptor limpa arquivo órfão quando a validação falha após o
    multer gravar; filtro por mimetype (não extensão) para aceitar HEIC de
    iPhone; fonte única dos valores de fonteFisica reconciliada na união
    literal de extracao/ports (satisfies quebra o build se divergir).
  - Aceitação: FotoEvidencia persistida e vinculável a CampoConferido; plano B
    registrado: storage em disco local se S3 atrasar a demo (constraint 1).

- [x] T2.4 — Deploy da API na AWS (descoberta desta rodada) · módulo: backend
  - Verificação: API pública respondendo com banco RDS e fotos no S3. Feito em
    2026-07-25: ECR + App Runner + IAM roles; health 200, login, cenário-âncora
    `divergente` só em serie-placa e upload com URL assinada — tudo pela URL
    pública. Receita e as 4 armadilhas em docs/deploy.md.
  - Motivo de existir: a Fase 3 precisa de HTTPS (câmera do navegador só abre
    em origem segura); sem deploy, T3.1 não roda no celular.
- [x] T2.5 — Página /demo servida pela API (descoberta desta rodada) · módulo: backend
  - Verificação: abrir /demo no celular, escolher etapa, fotografar, disparar
    conferência e ver veredito campo a campo. Feito em 2026-07-25 (agente
    Opus): tela única sem dependência externa, presets com as confianças
    medidas no spike, foto indo para o S3, veredito 100% vindo da API.
  - Desvio: é ferramenta TEMPORÁRIA de inspeção, fora de `frontend/` — não
    substitui a Fase 3; serve para validar a API sem esperar o app.
  - Atualizada na rodada nomes-e-analise (2026-07-25): virou fluxo GUIADO
    0→5 (entrar → etapa → etiqueta → fotos → extrair → veredito) com
    contexto "em produção" por passo e o Textract como único caminho de
    destaque; leituras digitadas viraram "modo avançado". Motivo: usuário
    real se perdeu na bancada. `?etapa=` passou a ser respeitado.
- [x] T2.6 — Conferência parcial por etapa (descoberta desta rodada) · módulo: conformidade
  - Feito em 2026-07-25 (agente Opus): itens da checklist ganharam `etapa`
    (codigo do Checkpoint em que a marcação passa a existir);
    `filtrarChecklistPorEtapa()` pura com semântica CUMULATIVA (o gate N
    reconfere o que os anteriores gravaram — detecta troca de peça);
    resposta expõe `etapaAvaliada` e `camposAvaliados`; recorte vazio → 422.
    Resolve o gap 11 do CLAUDE.md; item sem `etapa` é sempre avaliado.
- [x] T2.7 — Extração plugada no fluxo: POST /conferencias/executar-com-fotos (descoberta desta rodada) · módulo: conformidade (+ extracao, evidencias)
  - Feito em 2026-07-25 (agente Opus + rodada de análise): fotos já enviadas
    → bytes (S3/disco) → ExtractorPort → MESMO `executar()` — engine segue
    única. Endurecido pela revisão: `prepararExecucao()` resolve QR, etapa,
    projeto e recorte ANTES de pagar visão (422 barato) e antes de qualquer
    escrita; recorte filtra as fotos enviadas (resumo com
    `fotosForaDoRecorte`); evidência vinculada à conferência após o
    veredito; leituras conflitantes da mesma fonte → `nao_conferivel`
    (nunca escolha silenciosa). Antecipa o lado servidor da T3.2.
  - Verificação no ar: cenário-âncora com foto real via Textract →
    `divergente` só em serie-placa; 152 testes unitários.
- [x] T2.8 — Achados livres: consistência cruzada contra o QR (descoberta desta rodada) · módulo: extracao (+ conformidade)
  - Feito em 2026-07-25 (agente Opus): o Textract já devolvia TODO o texto de
    cada foto e a heurística descartava o que não era alvo; agora o descarte
    vira sinal com custo AWS ZERO (mesma resposta, nenhuma chamada a mais). A
    porta passou a devolver `ResultadoExtracao { leituras, achadosLivres }` —
    objeto explícito de propósito: adapter que "esquecer" os achados quebra a
    compilação em vez de perder dado calado. `cruzarAchados()` é pura: molde =
    comprimento dos identificadores DO PAYLOAD (nunca constante), candidato =
    só dígitos nesse comprimento, alarme = candidato que não bate com NENHUM
    valor do QR (pedido, seq e codigoProjeto contam como esperados).
  - Verificação: na peça de demo o alarme acusa a placa `847833` por um
    caminho independente da checklist; `/demo` desenha o bloco âmbar (nunca
    vermelho — vermelho é do `divergente`) com foto de origem por ocorrência.
  - Desvio: entrega um Could do SPEC dentro da Fase 2, porque o dado já estava
    pago. Regra de ferro provada por teste: achado livre NUNCA altera veredito
    de campo nem geral — consistência não enxerga ausência (peça com uma
    marcação só é trivialmente consistente). Sem persistência nesta rodada; o
    alerta persistente continua sendo a T4.3.
- [x] T2.9 — Hardening da superfície pública (descoberta desta rodada) · módulo: backend (+ conformidade)
  - Motivo: auditoria adversarial mostrou que o paliativo do gap 1 ("só existe
    o admin seed") era FALSO — `POST /auth/email/register` gravava a conta
    antes de mandar o e-mail, então sem SMTP a rota dava 500 com o usuário JÁ
    criado e o login seguinte funcionava: qualquer anônimo emitia o próprio
    JWT em duas requests.
  - Feito em 2026-07-25 (agente Opus): registro público desativado;
    POST/PATCH/DELETE de `projetos-modelo` fechados (a única escrita legítima
    da rodada é o seed) e POST/DELETE de `campos-conferidos` idem. O PATCH de
    `campos-conferidos` FICA, devolvendo 422 `campo-conferido-imutavel` — erro
    explícito informa melhor que 404. Provado pelo mapa de rotas no boot.
  - Aceitação: nenhum caminho HTTP autenticado produz `conforme` sem passar
    pela engine. Com o JWT anônimo dava para editar a checklist do
    ProjetoModelo até o cenário-âncora responder `conforme` — o falso OK
    emitido pela nossa própria API.
  - Desvio: o que não quebrava a demo nem produzia falso OK ficou aberto de
    propósito (gap 16 do CLAUDE.md): a correção honesta é RolesGuard + soft
    delete, trabalho de pós-demo. De carona na mesma rodada, o `.env` saiu da
    imagem Docker (o `.dockerignore` não o excluía e a camada do `COPY .`
    guardava as chaves AWS no ECR).
- [x] T2.10 — Coerência entre campos irmãos (descoberta desta rodada) · módulo: conformidade
  - Motivo: a série é gravada 3× no metal DE PROPÓSITO, mais uma vez na placa —
    redundância física da fábrica que o sistema desperdiçava, julgando cada
    posição isolada contra o QR. Medido: numa foto lateral o Textract leu
    `847833` onde a peça diz `847233` (84,6%), enquanto as outras duas
    posições leram `847233` a 98,8%. Com o limiar 0.9 o campo já saía
    `nao_conferivel` ("foto ruim"), mas ninguém ficava sabendo que ele tinha
    lido OUTRO NÚMERO — a diferença entre "tire a foto de novo" e "vá olhar
    aquela posição".
  - Feito em 2026-07-25 (agente Opus): `detectarIncoerencias()` pura em
    `conferencias/engine/coerencia.ts`, derivada do resultado por campo (não
    repete comparação, não entra no laço). O grupo de irmãos é descoberto por
    VALOR ESPERADO idêntico, nunca por lista em código: modelo com 2 ou 4
    chumbados funciona sem tocar código. A resposta ganhou `incoerencias`.
  - Aceitação: incoerência REBAIXA e nunca promove — `divergente` continua
    vencendo (defeito real da peça jamais vira "ruído de OCR") e o único
    caminho que ela abre é `conforme` → `nao_conferivel`. Não há voto
    majoritário: duas posições concordando NÃO aprovam a terceira.
  - Desvio: junto entrou a guarda de troca de campo (`leitura-de-outro-campo`)
    e o limiar medido 0.9, que fecharam a decisão em aberto mais antiga do
    projeto (campo parcialmente legível). Ficaram fora da comparação entre
    irmãos as leituras `conflitante` e `trocado` — não afirmam nada sobre a
    posição, e usá-las produziria alarme não determinista.

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
Depende de: Fase 3 completa — **e a dependência foi quebrada de propósito**
(2026-07-25). O BACKEND desta fase (T4.1–T4.3) entrou ANTES da Fase 3, contra
a convenção deste plano, porque a Fase 3 estava bloqueada por ele: o
`POST /passagens` gerado exige dois UUIDs (checkpoint e transformador) que um
front que só lê QR não conhece, e não havia como resolver `numeroSerie` →
peça. Sem esses endpoints, os critérios 5 e 6 eram impossíveis de implementar
na UI. A UI da fase (T4.4–T4.6) continua depois da Fase 3, na ordem original.

- [x] T4.1 — Passagem via scan de QR: endpoint · módulo: transito
  - Feito em 2026-07-25 (agente Opus): `POST /passagens/registrar`
    `{payloadQr, etapaCodigo, observacao?}` resolve a peça pelo QR
    (find-or-create por `numeroSerie`, o QR é a fonte da verdade), grava a
    passagem e devolve `ultimaConferencia` junto — o scan já traz o que o
    alerta do critério 6 precisa, sem segunda chamada.
  - Verificação: smoke local com scan repetido (passagens distintas e
    ordenadas), etapa desconhecida → 422 antes de qualquer escrita, peça
    inexistente → 404 (diferente de lista vazia).
  - Desvio: a identidade da peça passou a ter UM dono
    (`TransformadoresService.lerPayloadDoQr` e `.buscarOuCriarPorPayload`); a
    cópia privada que vivia na execução de conferência foi apagada, porque
    duas cópias divergentes já tinham causado achado nesta rodada.
- [x] T4.2 — Histórico da peça: endpoints de consulta · módulo: transito (+ transformadores)
  - Feito em 2026-07-25 (agente Opus): `GET /transformadores/:id/passagens`
    (ASC, critério 5), `GET /transformadores/:id/conferencias?limit=` (DESC —
    a primeira é o veredito vigente) e `GET /transformadores?numeroSerie=&pedido=`.
    Os três recortam o payload em vez de devolver o eager do gerador.
  - Aceitação: fecham parte do gap 4 do CLAUDE.md (listagens sem filtro por
    relação). `checkpoint` viaja junto do veredito de propósito — gap 14:
    `conforme` de gate parcial não atesta a peça inteira.
- [x] T4.3 — Alerta de divergência: dado do alerta na API · módulo: conformidade
  - Desvio: promovido da Fase 5 — alerta virou Should porque divergência para
    a produção até correção (2026-07-25).
  - Feito em 2026-07-25: o scan (`/passagens/registrar`) devolve
    `ultimaConferencia` e o histórico devolve as conferências da peça com
    veredito e etapa; o front tem o dado do alerta sem recalcular nada.
  - Falta (T4.6): a UI que torna isso inconfundível. Persistir a COBERTURA da
    conferência (gap 14) continua em aberto — hoje o alerta lê veredito e
    etapa e o consumidor decide.
- [ ] T4.4 — Tela de scan de passagem no checkpoint · módulo: frontend
  - Verificação manual: selecionar checkpoint, ler QR, passagem criada com
    timestamp.
  - Aceitação: scans repetidos no mesmo checkpoint não corrompem o histórico
    (passagens distintas, ordenadas).
- [ ] T4.5 — Tela de histórico da peça · módulo: frontend
  - Verificação manual: critério 5 do SPEC executado ponta a ponta.
  - Aceitação: histórico em ordem cronológica com nome do checkpoint e hora.
- [ ] T4.6 — Alerta de divergência na UI · módulo: frontend
  - Verificação manual: critério 6 do SPEC executado ponta a ponta.
  - Aceitação: alerta inconfundível fora da tela de veredito e no scan em
    checkpoint de peça divergente; o front exibe o veredito que a API gravou,
    nunca um recalculado.

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

- [ ] T6.1 — Upload do PDF e extração da checklist via Bedrock · módulo: extracao (+ projetos-modelo)
  - Verificação manual: subir o EPT-163-PI-676 e comparar a checklist extraída
    com a seedada na Fase 0 (gabarito conhecido).
  - Aceitação: proposta de checklist com campo, fonte física e obrigatoriedade;
    nunca cria ProjetoModelo direto — sempre passa pela revisão (T6.2).
  - Nota (rodada de análise, 2026-07-25): o PDF é só o projeto de SERIGRAFIA —
    placa e chumbados não nascem dele. A proposta deve vir pré-populada com o
    esqueleto padrão (serie-chumbada-1..3, serie-placa, patrimonio-placa) e o
    PDF contribui os itens de serigrafia; origem do 3× é decisão em aberto no
    SPEC (padrão de fábrica × por modelo).
- [ ] T6.2 — Tela de revisão e aprovação da checklist · módulo: frontend (+ projetos-modelo)
  - Verificação manual: editar um item extraído errado e aprovar; ProjetoModelo
    criado reflete a edição.
  - Aceitação: aprovação é por modelo (uma vez), não por peça — checklist
    errada aprovada às cegas corromperia todas as conferências do modelo.

## Riscos e dependências

- **Série chumbada ilegível para OCR** (SPEC, constraint 2) → RISCO DISSOLVIDO
  em 2026-07-25: o Textract leu o relevo a 99,9% (topo) e 96,7% (diagonal) nas
  fotos reais (docs/visao-ocr.md). O plano C (campo `nao_conferivel` com foto)
  segue valendo para foto ruim — medido: um chumbado saiu a 35,4% e a engine o
  barrou corretamente.
- **Prazo de 2 dias** (SPEC, constraint 1) → Fase 5 opcional; T2.3 com fallback
  de disco local; corte na ordem Could → Should, nunca no Must.
- **Payload do QR desconhecido** (SPEC, constraint 5) → T1.1 na frente de tudo
  que depende dele; plano B: digitação manual dos valores esperados.
- **Créditos AWS** (SPEC, constraint 4) → visão só sob disparo explícito
  (T3.2, e no servidor uma chamada por foto com teto de 10); spike com timebox
  (T2.1). O bloqueio de cotas do Bedrock que assombrou o dia CAIU na noite de
  2026-07-25, e deixou de ser risco por outro motivo: medido, o Bedrock foi
  REPROVADO para leitura numérica (docs/visao-ocr.md) e a demo não depende
  dele. O custo real medido é irrisório — 15 chamadas Textract ≈ USD 0,023.

## Decisões em aberto

- [x] **Política para campo parcialmente legível** — resolvido: rejeitar
      sempre (limiar 0.9, medido com a peça real na T2.1/rodada
      nomes-e-analise); similaridade aproximada fica fora — em série de
      transformador, "quase igual" é divergente (2026-07-25).
- [ ] **Formato do payload do QR** — campos embutidos ou código de lookup;
      afeta T1.1 e T3.1.
- [x] **Textract vs Bedrock para extração** — resolvido: TEXTRACT, medido com
      as fotos reais (docs/visao-ocr.md); leu inclusive o relevo chumbado, que
      era o risco. Reavaliado na noite de 2026-07-25, com a conta destravada:
      o Bedrock foi reprovado para leitura numérica POR MEDIÇÃO (alucinou
      número plausível onde o Textract devolveu null, e não dá confiança
      calibrada); segue candidato só ao check qualitativo de layout.
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

<!-- rodada: analise-e-coerencia @ 96f8527 -->
