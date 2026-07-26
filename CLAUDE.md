# TRAEL Conferência

> Sistema de conferência de identidade e rastreabilidade de transformadores na
> linha de produção da TRAEL (HackStars Batch #2): lê o QR da etiqueta (fonte
> da verdade), extrai por visão os identificadores físicos da peça e emite
> veredito de conformidade campo a campo, com evidência fotográfica.

Leia este arquivo no início de toda sessão — ele é o **contrato de como
escrevemos código aqui**, não documentação. Quando uma convenção for decidida
durante a implementação, registre-a aqui. Contexto detalhado mora em @SPEC.md
(o quê e por quê) e @PLAN.md (ordem de execução).

**Fase atual = Fase 2 — Extração por visão.** ERP, câmeras fixas e perfis de
usuário não pertencem a esta rodada; estão em SPEC.md, seção "Planejado /
rodadas futuras".

## Regra de ouro

**O veredito de conformidade nasce exclusivamente na API: o front nunca compara
campos, e todo dado extraído por visão/OCR entra no sistema com score de
confiança e foto-evidência anexada, nunca como fato.** Tudo abaixo é
desdobramento disso.

Na prática: o `frontend` envia QR e fotos e renderiza vereditos prontos; a engine em
`conformidade` é a única que compara; `extracao` devolve leituras com confiança
e vínculo à foto de origem, e uma leitura sem confiança ou sem evidência não
entra no banco. Um campo ilegível é `nao_conferivel` — rebaixá-lo para
`conforme` é o bug mais caro possível neste domínio (o falso OK é exatamente a
não conformidade que chega ao cliente hoje).

## Stack

| Camada  | Tecnologia                                                       |
| ------- | ---------------------------------------------------------------- |
| API     | NestJS (base brocoders/nestjs-boilerplate), TypeORM + PostgreSQL |
| Front   | Next.js 16 (React 19, Tailwind 4), mobile-first                  |
| Visão   | AWS Textract (spike T2.1); Bedrock como reforço opcional         |
| Storage | AWS S3 (fallback: disco local, se S3 ameaçar o prazo)            |
| Deploy  | ECR + App Runner (HTTPS), RDS PostgreSQL — receita em docs/deploy.md |

## Estrutura

```
backend/                  # NestJS (base brocoders/nestjs-boilerplate)
  src/
    transformadores/      # CRUD Transformador (gerado); recebe o parser do QR (T1.1)
    projetos-modelo/      # CRUD ProjetoModelo (gerado); checklist por modelo como dado
    conferencias/         # CRUD Conferencia (gerado); recebe a engine de comparação (T1.2)
    campos-conferidos/    # CRUD CampoConferido (gerado)
    fotos-evidencia/      # CRUD FotoEvidencia (gerado); recebe upload/S3 (T2.3)
    checkpoints/          # CRUD Checkpoint (gerado); seed das etapas ordenadas da linha
    passagens/            # CRUD Passagem (gerado); trânsito (T4.1)
    extracao/             # ExtractorPort + adapters textract|bedrock|mock;
                          #   driver por env EXTRACTOR_DRIVER (mock default)
    auth/, files/, i18n/  # herdados do boilerplate; não usados nesta rodada
frontend/                 # Next.js 16: leitura QR, fotos, veredito, histórico
```

Pasta e rota vão no plural correto do português (`transformadores/`,
`campos-conferidos/`, `projetos-modelo/`) — o gerador aprendeu os plurais do
domínio, então entidade nova já nasce com a pasta e a rota certas; se um nome
novo não estiver coberto, corrija a regra no gerador, não o resultado à mão.
Nome de classe segue singular (`Transformador`, `CampoConferido`) — só a pasta
e a rota pluralizam. O mapa conceitual do PLAN: transformadores →
`transformadores/`, conformidade → `conferencias/` + `campos-conferidos/`,
evidencias → `fotos-evidencia/`, transito → `checkpoints/` + `passagens/`.
Entidade ou propriedade nova entra pelos generators (recipe em
backend/CLAUDE.md), nunca à mão.

Funcionalidade nova entra como módulo novo atrás das mesmas fronteiras
(auditoria, ERP e câmeras fixas já estão planejadas assim); nada novo entra
dentro da engine de conformidade.

## Como rodar

```bash
# 1ª vez: criar o env (APP_PORT=3001 vive só aí; sem ele a API sobe em :3000)
cd backend && sed 's/^DATABASE_HOST=postgres/DATABASE_HOST=localhost/' env-example-relational > .env
cd backend && docker compose up -d postgres && npm run migration:run && npm run seed:run:relational
cd backend && npm run start:dev   # API em :3001, swagger em /docs
cd frontend && npm run dev        # app em :3000; API derivada do host da página
cd backend && npm run test        # unit da engine e do parser (existem a partir da T1.2)
# CRUD gerado exige JWT: login com o admin seed do boilerplate
# (admin@example.com / secret) em POST /api/v1/auth/email/login
```

## Engine de conformidade

- Função pura: (valores esperados do QR) + (leituras com confiança) →
  vereditos por campo + veredito geral. Zero imports de I/O, SDK ou repositório.
- Precedência do veredito geral: `divergente` > `nao_conferivel` > `conforme`.
  `conforme` só com todos os campos conformes.
- Limiar de confiança é parâmetro da engine, não constante enterrada (a
  política de campo parcialmente legível está em aberto e vai mudar isso).
  Default do endpoint: `LIMIAR_CONFIANCA_PADRAO = 0.8` em
  `conferencia-execucao.service.ts`, sobrescrevível por request.
- Escrita de veredito tem UM caminho: `CamposConferidosService.criarComVeredito`
  (server-side, sem rota HTTP). Nunca crie outro — é o que mantém a regra de
  ouro auditável.
- CampoConferido é IMUTÁVEL via HTTP (update → 422): PATCH no lastro
  (valores/confiança/foto) de um veredito já emitido falsificaria a trilha de
  auditoria (revisão R1). Comparação usa Unicode NFC; confiança <= 0 nunca é
  lastro, mesmo com limiar 0.
- Fluxo do endpoint `POST /conferencias/executar`: `prepararExecucao()` (parse
  do QR → checkpoint → ProjetoModelo → checklist → recorte da etapa) e SÓ
  DEPOIS find-or-create por numeroSerie → engine → persistência. Toda a fase
  barata é read-only: nenhum 422 (etapa desconhecida, projeto indeterminado,
  recorte vazio) pode deixar peça órfã no banco. Com `etapaCodigo`, a checklist
  é recortada por etapa (semântica CUMULATIVA: a etapa N confere o que ela e as
  anteriores gravaram); recorte vazio → 422 `etapa-sem-campos-conferiveis`.
- `ConferenciaExecucaoService.prepararExecucao` é a resolução ÚNICA de
  ProjetoModelo (codigoProjeto do QR → vínculo da peça → único do banco) e do
  recorte por etapa. Quem precisar da checklist antes do veredito chama ela e
  passa o `ContextoExecucao` de volta ao `executar()` — duas resoluções
  independentes já divergiram (a extração lia a checklist de um projeto e a
  engine avaliava outro).
- `POST /conferencias/executar-com-fotos` é a variante com visão real: prepara
  primeiro (todo 422 antes de gastar), manda ao ExtractorPort só as fotos cuja
  `fonteFisica` tem campo NO RECORTE da etapa, e delega o veredito ao MESMO
  `executar()` — nunca duplique a orquestração; a extração só produz leituras,
  quem compara continua sendo a engine. As fotos efetivamente usadas ficam
  vinculadas à conferência depois que ela é criada (foto já presa a outra
  conferência → 422 `foto-evidencia-de-outra-conferencia`, antes da visão).
- A lista de campos a conferir também é parâmetro — o chamador a carrega da
  checklist do ProjetoModelo da peça (seed da demo: EPT-163-PI-676). Serigrafia
  varia por cliente/modelo; lista hardcoded geraria falso conforme para outros
  modelos, e checklist em código morreria a cada modelo novo.

## Extração e bordas AWS

- Toda borda externa entra atrás de porta mockável: `ExtractorPort` em
  `extracao`, storage em `evidencias`. Consumidores testam com mock; o adapter
  real se verifica manualmente com as fotos da demo.
- Serviços, modelos (IDs Bedrock), custos e checklist de setup AWS:
  docs/aws.md. Resultado do spike e limites medidos: docs/visao-ocr.md.
- `EXTRACTOR_DRIVER`: `mock` (default, funciona sem AWS), `textract` (a escolha
  do spike) ou `bedrock` (reforço; hoje bloqueado pela conta AWS).
- SSL do banco é condicional a `DATABASE_SSL_ENABLED` — RDS exige TLS, o
  Postgres local do docker não suporta; fixar um dos dois quebra o outro.
- Spike T2.1 executável: `npx ts-node -r tsconfig-paths/register
  scripts/spike-extracao.ts <dir-fotos>` (fotos nomeadas pela fonte:
  placa.jpg, chumbado-1.jpg…). Sem credencial, falha com mensagem apontando
  docs/aws.md.
- Fonte única em código dos valores de `fonteFisica`: união literal
  `FonteFisica` em extracao/ports/extractor.port.ts; fotos-evidencia deriva
  dela com `satisfies` (divergência quebra a compilação).
- Nenhuma chamada de visão fora de ação explícita do operador — créditos AWS
  são finitos (SPEC, constraint 4); sem reprocessamento em loop.
- Leitura retornada pelo adapter sempre carrega: valor, confiança, tipo da
  fonte física (placa, serigrafia, chumbado 1..3), referência à foto e, quando
  o serviço fornecer, o bounding box da leitura (`regiaoLeitura`) — dado
  barato agora que habilita a conferência posicional futura.
- `extrair` devolve `ResultadoExtracao { leituras, achadosLivres }`: dois canais
  na MESMA resposta do serviço (zero chamada AWS a mais). Achado livre é o
  texto lido que não virou leitura de campo alvo; `cruzarAchados` (pura, em
  `conferencias/conferencia-extracao.service.ts`) o cruza contra o QR e devolve
  `achadosInconsistentes` na resposta de `executar-com-fotos`. É ALARME:
  nunca toca `vereditoGeral` nem campo, e não é persistido nesta rodada
  (alerta persistente é T4.3). Candidato é só dígito com o comprimento de um
  identificador DO PAYLOAD — comprimento hardcoded viraria spam com a próxima
  numeração de cliente.

## Contrato API ↔ Front

- O `frontend` não conhece regra de comparação nem limiar; renderiza o que a
  API responder. Se a UI precisar de um dado derivado, o dado nasce na API.
- O Next.js tem lado server (route handlers, server components), mas ele não é
  uma segunda API: regra de negócio, comparação e acesso AWS continuam no
  NestJS.
- Payload do QR é decodificado no front (leitura da câmera) mas interpretado
  na API (parser em `transformadores`) — o front não extrai campos do payload.

## Convenções

- TypeScript estrito nos dois lados; named exports; DTOs com class-validator
  no padrão do boilerplate.
- Domínio em português nos nomes de entidade e campo (Conferencia,
  CampoConferido, `nao_conferivel`) — vocabulário do desafio TRAEL; termos de
  infraestrutura em inglês (port, adapter, controller).
- Testes: unit (Jest) para engine e parser — rodam sem tocar borda real;
  bordas (visão, S3, UI) verificam-se manualmente com roteiro do PLAN.
- Segredos: credenciais AWS só em `backend/.env` (fora do git); nada de
  segredo em variável `NEXT_PUBLIC_*` — todo acesso AWS passa pela API.
- Valores canônicos de `fonteFisica`: `placa`, `serigrafia`, `chumbado-1..3`.
  A fonte única é a checklist do ProjetoModelo; FotoEvidencia e extração usam
  as mesmas strings (grafia divergente quebra o pareamento campo ↔ evidência).
- Identificadores estáveis: gates e regras casam por `codigo` (Checkpoint,
  ProjetoModelo), nunca por nome exibido nem por `ordem` — nome e ordem mudam.
- Boilerplate traz auth/i18n que não usamos nesta rodada: não gastar tempo
  removendo, apenas não usar.

## Nunca fazer

- Nunca calcular ou "corrigir" veredito no front — regra de ouro; o front
  exibe o que a API decidiu.
- Nunca rebaixar campo ilegível ou de baixa confiança para `conforme` — o
  falso OK é a dor central do desafio (NC chegando ao cliente).
- Nunca persistir leitura de visão sem confiança e sem referência à
  foto-evidência — sem lastro, a conferência não é auditável.
- Nunca commitar credencial AWS nem expô-la ao front (`NEXT_PUBLIC_*` ou
  bundle) — segredo vive em `backend/.env`; vazamento queima os USD 500 de
  créditos e a conta.
- Nunca chamar SDK AWS fora de `extracao`/`evidencias` — a troca
  Textract ↔ Bedrock e os testes com mock dependem dessa fronteira.
- Nunca inventar valor esperado que não veio do payload do QR — fonte da
  verdade única nesta rodada (SPEC, constraint 5).

## Gaps conhecidos

Dívidas deliberadas confirmadas na auditoria de 2026-07-25, aceitas pelo prazo
do hackathon:

1. CRUD do domínio sem RolesGuard — qualquer JWT edita/deleta; paliativo:
   ambiente de demo com admin seed único. Revisar antes de expor fora da rede
   local.
2. Hard delete com FKs `NO ACTION` — deletar pai com filhos estoura 500;
   paliativo: a UI não expõe delete. Trilha de auditoria pedirá soft delete na
   rodada de produção.
3. Eager loading em cascata nas relações geradas — payloads grandes e joins
   duplicados; aceitável no volume da demo, e os endpoints das Fases 3–4
   selecionam o que expõem.
4. Listagens sem filtro por relação (só paginação global) — os endpoints de
   consulta reais (veredito por conferência, histórico por peça) entram nas
   Fases 3–4.
5. `checklist` como varchar validado só por `@IsString` — vira jsonb com
   validação estruturada quando a ingestão de projeto (Fase 6) existir; até
   lá, a única escrita é o seed.
6. `Record not found` genérico vira 500 nos updates (default do boilerplate) —
   tratar quando os endpoints de domínio forem escritos (T1.3+).
7. Paginação (page/limit/teto 50) literal e duplicada nos 7 controllers —
   default do gerador; unificar só se doer.
8. `cliente` como string livre — decisão em aberto no SPEC (vira entidade na
   rodada ERP).
9. Execução da conferência não é transacional — falha no meio do loop de
   campos deixa conferência com veredito geral e campos parciais; janela
   pequena, aceito no prazo (revisão R1). Transação entra com o hardening
   pós-demo.
10. `confianca` forjável — RESOLVIDO no caminho principal (2026-07-25):
    `POST /conferencias/executar-com-fotos` carimba confiança e evidência
    server-side (extração plugada). O `/executar` com leituras digitadas
    permanece (modo avançado do /demo e testes sem AWS) e nele a confiança
    segue vindo do cliente — aceito enquanto a rota existir; some com o gap
    13 (remoção do /demo).
11. RESOLVIDO (2026-07-25): a conferência parcial por etapa existe — cada item
    da checklist diz sua `etapa`, e `POST /conferencias/executar` com
    `etapaCodigo` recorta a checklist (cumulativo). O comportamento antigo
    (checklist inteira) permanece quando a request não manda etapa.
12. Chaves AWS vivem nas variáveis do serviço App Runner porque o boilerplate
    valida `ACCESS_KEY_ID`/`SECRET_ACCESS_KEY` quando `FILE_DRIVER=s3`
    (files/config/file.config.ts). A instance role existe e já serve
    Textract/Bedrock; migrar o S3 para ela exige tornar as credenciais
    opcionais no boilerplate (4 arquivos).
13. Página `/demo` (src/demo) é ferramenta temporária de inspeção servida pela
    API, com credenciais do admin seed pré-preenchidas — remover antes de
    qualquer uso fora do hackathon.
14. Conferência parcial persiste `vereditoGeral` sem marca de cobertura: a
    resposta diz `etapaAvaliada`/`camposAvaliados`, mas a linha gravada em
    `conferencia` não distingue "conforme na peça inteira" de "conforme no
    gate da adesivação" (3 chumbados, placa jamais conferida). Consequência:
    "última conferência conforme" NÃO é atestado de peça completa — T4.3
    (alerta) e T5.1 (dashboard) precisam ler a etapa junto do veredito.
    Persistir a cobertura (flag de conferência completa, ou contagem de campos
    do recorte × total da checklist) fica para a Fase 4.
15. `Checkpoint.ordem` sem unique e editável pelo CRUD — e a semântica
    cumulativa do recorte depende inteiramente dela: remanejar a ordem
    reescreve, retroativamente, o que cada gate confere (e duas etapas com a
    mesma ordem tornam o recorte ambíguo). Paliativo: as ordens vêm de seed
    fixo e a UI não expõe edição de checkpoint. Unique em `ordem` + política de
    reordenação (renumerar em transação, ou ordem imutável com posição
    derivada) ficam para a rodada de produção.

## Decisões em aberto

- [ ] **Política para campo parcialmente legível** — rejeitar sempre ou
      similaridade ≥ N% com revisão humana (afeta T1.2).
- [ ] **Formato do payload do QR** — campos embutidos ou código de lookup
      (afeta T1.1, T3.1).
- [x] **Textract vs Bedrock** — resolvido: Textract (spike T2.1 com fotos
      reais, docs/visao-ocr.md). `EXTRACTOR_DRIVER=textract`; Bedrock fica
      como reforço opcional para foto ruim (2026-07-25).
- [x] **Framework do front** — resolvido: Next.js 16; scaffold já subido pelo
      time venceu o Angular combinado na entrevista (2026-07-25).
