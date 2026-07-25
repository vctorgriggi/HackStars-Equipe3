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
| Visão   | AWS Textract ou Bedrock — decisão no spike T2.1                  |
| Storage | AWS S3 (fallback: disco local, se S3 ameaçar o prazo)            |

## Estrutura

```
backend/                  # NestJS (base brocoders/nestjs-boilerplate)
  src/
    transformadors/       # CRUD Transformador (gerado); recebe o parser do QR (T1.1)
    projeto-modelos/      # CRUD ProjetoModelo (gerado); checklist por modelo como dado
    conferencia/          # CRUD Conferencia (gerado); recebe a engine de comparação (T1.2)
    campo-conferidos/     # CRUD CampoConferido (gerado)
    foto-evidencia/       # CRUD FotoEvidencia (gerado); recebe upload/S3 (T2.3)
    checkpoints/          # CRUD Checkpoint (gerado); seed das etapas ordenadas da linha
    evento-passagems/     # CRUD EventoPassagem (gerado); trânsito (T4.1)
    extracao/             # (a criar em T2.2) ExtractorPort + adapters AWS
    auth/, files/, i18n/  # herdados do boilerplate; não usados nesta rodada
frontend/                 # Next.js 16: leitura QR, fotos, veredito, histórico
```

Nomes de pasta seguem a pluralização do gerador (transformadors,
evento-passagems) — não renomear, os generators dependem disso. O mapa
conceitual do PLAN: transformadores → `transformadors/`, conformidade →
`conferencia/` + `campo-conferidos/`, evidencias → `foto-evidencia/`,
transito → `checkpoints/` + `evento-passagems/`. Entidade ou propriedade nova
entra pelos generators (recipe em backend/CLAUDE.md), nunca à mão.

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
- Escrita de veredito tem UM caminho: `CampoConferidosService.criarComVeredito`
  (server-side, sem rota HTTP). Nunca crie outro — é o que mantém a regra de
  ouro auditável.
- Fluxo do endpoint `POST /conferencia/executar`: parse do QR → find-or-create
  por numeroSerie → ProjetoModelo (codigoProjeto do QR → vínculo da peça →
  único do banco) → checklist → engine → persistência. Checkpoint resolve
  ANTES de qualquer escrita.
- A lista de campos a conferir também é parâmetro — o chamador a carrega da
  checklist do ProjetoModelo da peça (seed da demo: EPT-163-PI-676). Serigrafia
  varia por cliente/modelo; lista hardcoded geraria falso conforme para outros
  modelos, e checklist em código morreria a cada modelo novo.

## Extração e bordas AWS

- Toda borda externa entra atrás de porta mockável: `ExtractorPort` em
  `extracao`, storage em `evidencias`. Consumidores testam com mock; o adapter
  real se verifica manualmente com as fotos da demo.
- Serviços, modelos (IDs Bedrock), custos e checklist de setup AWS:
  docs/aws.md — o setup (model access, IAM, bucket) precisa acontecer antes da
  Fase 2.
- Nenhuma chamada de visão fora de ação explícita do operador — créditos AWS
  são finitos (SPEC, constraint 4); sem reprocessamento em loop.
- Leitura retornada pelo adapter sempre carrega: valor, confiança, tipo da
  fonte física (placa, serigrafia, chumbado 1..3), referência à foto e, quando
  o serviço fornecer, o bounding box da leitura (`regiaoLeitura`) — dado
  barato agora que habilita a conferência posicional futura.

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

## Decisões em aberto

- [ ] **Política para campo parcialmente legível** — rejeitar sempre ou
      similaridade ≥ N% com revisão humana (afeta T1.2).
- [ ] **Formato do payload do QR** — campos embutidos ou código de lookup
      (afeta T1.1, T3.1).
- [ ] **Textract vs Bedrock** — resolver no spike T2.1 com as fotos reais
      (afeta T2.2).
- [x] **Framework do front** — resolvido: Next.js 16; scaffold já subido pelo
      time venceu o Angular combinado na entrevista (2026-07-25).
