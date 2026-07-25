# TRAEL Conferência

> Sistema de conferência de identidade e rastreabilidade de transformadores na
> linha de produção da TRAEL (HackStars Batch #2): lê o QR da etiqueta (fonte
> da verdade), extrai por visão os identificadores físicos da peça e emite
> veredito de conformidade campo a campo, com evidência fotográfica.

Leia este arquivo no início de toda sessão — ele é o **contrato de como
escrevemos código aqui**, não documentação. Quando uma convenção for decidida
durante a implementação, registre-a aqui. Contexto detalhado mora em @SPEC.md
(o quê e por quê) e @PLAN.md (ordem de execução).

**Fase atual = Fase 1 — Núcleo de conformidade (TDD).** ERP, câmeras fixas e
perfis de usuário não pertencem a esta rodada; estão em SPEC.md, seção
"Planejado / rodadas futuras".

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
cd backend && docker compose up -d postgres && npm run start:dev  # API em :3001, swagger em /docs
cd frontend && npm run dev                                        # app em :3000
cd backend && npm run test    # unit da engine e do parser
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
- A lista de campos a conferir também é parâmetro — serigrafia varia por
  cliente/modelo (projeto de serigrafia, SPEC Planejado); hardcodar a lista da
  peça de demo dentro da engine geraria falso conforme para outros modelos.

## Extração e bordas AWS

- Toda borda externa entra atrás de porta mockável: `ExtractorPort` em
  `extracao`, storage em `evidencias`. Consumidores testam com mock; o adapter
  real se verifica manualmente com as fotos da demo.
- Nenhuma chamada de visão fora de ação explícita do operador — créditos AWS
  são finitos (SPEC, constraint 4); sem reprocessamento em loop.
- Leitura retornada pelo adapter sempre carrega: valor, confiança, tipo da
  fonte física (placa, serigrafia, chumbado 1..3) e referência à foto.

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

## Decisões em aberto

- [ ] **Política para campo parcialmente legível** — rejeitar sempre ou
      similaridade ≥ N% com revisão humana (afeta T1.2).
- [ ] **Formato do payload do QR** — campos embutidos ou código de lookup
      (afeta T1.1, T3.1).
- [ ] **Textract vs Bedrock** — resolver no spike T2.1 com as fotos reais
      (afeta T2.2).
- [x] **Framework do front** — resolvido: Next.js 16; scaffold já subido pelo
      time venceu o Angular combinado na entrevista (2026-07-25).
