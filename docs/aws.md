# AWS — serviços, modelos, custos e setup

> Referência dos serviços AWS que o projeto usa: qual serviço faz o quê, IDs
> de modelo, estimativa de custo contra os USD 500 de créditos, o setup que
> foi feito e o estado real da conta. A escolha Textract × Bedrock está
> DECIDIDA e medida — o resultado mora em docs/visao-ocr.md; aqui fica só a
> parte de infraestrutura.

## Serviços e onde entram

| Serviço | Papel | Estado |
| --- | --- | --- |
| S3 | Storage das fotos de evidência (FotoEvidencia); URLs assinadas para o front | EM USO (bucket `trael`, `FILE_DRIVER=s3`) |
| Textract | OCR de todas as fontes físicas — placa, serigrafia e o relevo chumbado; devolve bounding boxes de graça | EM USO, é o driver do ambiente no ar (`EXTRACTOR_DRIVER=textract`) |
| Bedrock | Reprovado para leitura numérica por medição (docs/visao-ocr.md); segue candidato só ao check qualitativo de layout (Could) e à ingestão do PDF de projeto (Fase 6) | Adapter existe, desligado |

O boilerplate já traz driver S3 pronto: `FILE_DRIVER=s3` + `ACCESS_KEY_ID`,
`SECRET_ACCESS_KEY`, `AWS_S3_REGION`, `AWS_DEFAULT_S3_BUCKET` no
`backend/.env` (nomes já existem no `env-example-relational`).

## Modelos no Bedrock

**Nesta conta, os modelos Claude NÃO respondem.** Medido em 2026-07-25: os
Claude 3 aparecem bloqueados como "legacy" (desuso da conta) e os modelos de
fronteira negam o invoke mesmo com agreement aceito; o que responde é a
família **Amazon Nova** (Lite e Pro). Foi com ela que a reprovação do Bedrock
para leitura numérica foi medida (docs/visao-ocr.md). A tabela abaixo fica
como referência de planejamento — não como configuração que funcione aqui.

IDs no Bedrock levam prefixo `anthropic.` — não usar o ID first-party puro.

| Modelo | ID no Bedrock | Referência de preço first-party (in/out por MTok) | Estado nesta conta |
| --- | --- | --- | --- |
| Claude Opus 5 | `anthropic.claude-opus-5` | USD 5 / 25 | invoke negado |
| Claude Sonnet 5 | `anthropic.claude-sonnet-5` | USD 3 / 15 (intro 2/10 até 2026-08-31) | invoke negado |
| Claude Haiku 4.5 | `anthropic.claude-haiku-4-5` | USD 1 / 5 | invoke negado |
| Amazon Nova (Lite e Pro) | id da própria AWS, sem prefixo `anthropic.` | preço AWS (ver link abaixo) | ÚNICOS que respondem — e foram eles que reprovaram o Bedrock na leitura numérica |

Bedrock é operado pela AWS com preços próprios (consultar
https://aws.amazon.com/bedrock/pricing/); os valores acima são a referência
first-party. Visão em alta resolução (Opus 5 / Sonnet 5): até 2576 px no lado
maior, ~4.800 tokens por imagem no teto — fotos de celular redimensionadas
ficam bem abaixo disso.

## Acesso a partir do NestJS

- **Bedrock**: SDK TypeScript `@anthropic-ai/bedrock-sdk`, cliente
  `AnthropicBedrockMantle` (`new AnthropicBedrockMantle({ awsRegion })`), mesma
  surface `messages.create` do SDK first-party. Sempre dentro do adapter em
  `extracao/` (regra de ouro: SDK AWS não sai de `extracao`/`evidencias`).
- **Textract**: `@aws-sdk/client-textract` (`DetectDocumentTextCommand`).
- **S3**: caminho do boilerplate (módulo files, driver s3).

## Custo estimado contra os USD 500

Uma conferência completa da demo ≈ 6 fotos (placa, serigrafia, 3 chumbados,
geral):

- **Bedrock Opus 5**: ~15–30k tokens de entrada + ~1k de saída ≈ USD 0,10–0,20
  por conferência.
- **Textract**: ~USD 0,0015 por página → ≈ USD 0,01 por conferência. Com a
  corroboração por recorte da série chumbada (1 leitura da foto + 2 releituras
  de recorte, só nas fotos com marcação em relevo) o teto sobe para **USD
  0,0225 por conferência** — ~22 mil conferências dentro dos créditos. Custo
  não é restrição; o teto é FIXO (3 chamadas por foto), nunca um laço.
- **S3**: centavos no volume da demo.

Cem conferências de teste + demo custam < USD 25 no pior caso. O risco de
custo não é a demo — é loop de reprocessamento automático, que a constraint 4
do SPEC já proíbe (visão só sob disparo explícito).

## Checklist de setup (feito; serve de receita para refazer a conta)

1. Conta AWS com os créditos aplicados; região única para tudo — FEITO,
   `us-east-1`.
2. Console → Bedrock → Model access → habilitar os modelos. FEITO, mas nesta
   conta só a família Amazon Nova respondeu (ver "Modelos no Bedrock").
3. IAM user de aplicação com política mínima: `bedrock:InvokeModel`,
   `textract:DetectDocumentText`, `textract:AnalyzeDocument`, `s3:PutObject`/
   `s3:GetObject` no bucket do projeto. Nada de credencial root — PENDENTE,
   ver o ALERTA de segurança abaixo.
4. Bucket S3 do projeto criado; nome no `AWS_DEFAULT_S3_BUCKET` — FEITO
   (bucket `trael`).
5. Credenciais só em `backend/.env` (gitignored). Nunca em `NEXT_PUBLIC_*`,
   nunca commitadas — vazamento queima créditos e conta (CLAUDE.md, Nunca
   fazer). Vale também para a imagem Docker: o `.env` foi excluído do
   `.dockerignore` depois de a camada do `COPY .` guardá-lo no ECR.
6. Smoke test barato antes de qualquer spike: uma chamada Textract e uma
   Bedrock com qualquer foto, para validar credencial/região/model access sem
   gastar timebox. Foi o que separou "não tenho acesso" de "o modelo erra".

## Estado da conta (validado em 2026-07-25, via terminal)

- **Região**: us-east-1. **Bucket**: `trael` — existe e funciona; FILE_DRIVER=s3
  ativo no dev e verificado (upload → objeto no bucket → URL assinada abre
  com 200).
- **Textract**: funcionando (DetectDocumentText validado com credencial atual).
- **Bedrock** (fechado na noite de 2026-07-25): DESTRAVADO e MEDIDO — deixou
  de ser um problema de acesso e virou uma decisão técnica. O acesso responde
  para a família **Amazon Nova**; os Claude 3 aparecem como "legacy"
  bloqueado por desuso da conta e os modelos de fronteira seguem negando o
  invoke mesmo com agreement AVAILABLE (aceitos via CLI
  `create-foundation-model-agreement`). Com o que responde, a medição contra
  o gabarito da peça REPROVOU o Bedrock para leitura numérica
  (docs/visao-ocr.md): alucinou número plausível onde o Textract devolveu
  null, e não devolve confiança calibrada. Não há mais nada a destravar para
  a demo — o adapter fica desligado, candidato apenas ao check qualitativo de
  layout. Histórico útil se alguém repetir o caminho: durante o dia as cotas
  de inferência Claude estavam aplicadas em 0 (restrição automática de conta
  nova) com 4 pedidos PENDING no Service Quotas; se um dia o id
  `anthropic.claude-*` responder erro de inference profile, o prefixo `us.`
  entra por `BEDROCK_MODEL_ID`.
- **Guardrails e Knowledge Bases (Bedrock)**: recomendação registrada — NÃO
  usar neste caso de uso. Guardrails filtra conteúdo em apps conversacionais;
  nosso Bedrock faz extração estruturada com parse defensivo e a engine
  valida tudo. Knowledge Bases é RAG; nossa fonte é a checklist no Postgres.
  Complexidade sem benefício para a demo.
- **Custo RDS**: `database-1` é db.r7g.large (~USD 170+/mês on-demand) —
  para o hackathon, reduzir para db.t4g.micro ou parar quando não estiver em
  uso. Há ainda uma segunda instância órfã (`database-1-instance-1`, Aurora
  serverless, parada — sobra de criação) que pode ser deletada.
- **ALERTA de segurança**: a credencial no .env é do usuário **root** da conta
  (`arn:...:root`) — contra o checklist acima. Criar IAM user com a política
  mínima, trocar a chave no .env e DESATIVAR a chave root. Vazamento da chave
  root = conta inteira comprometida.
- **RDS** (`database-1...rds.amazonaws.com`): o time habilitou acesso público
  (IP público, TCP e auth OK) e as **migrations + seeds já foram rodadas lá**
  (PostgreSQL 18.3; 4 checkpoints, 1 projeto, admin seed). Pronto para servir
  de banco compartilhado: qualquer dev aponta o .env com
  DATABASE_HOST=<endpoint> USERNAME=postgres NAME=postgres
  DATABASE_SSL_ENABLED=true (endpoint e senha no .env comentado). O dev do
  Victor segue no Postgres local (latência menor); trocar é só env.
- **Redis/ElastiCache**: criado na conta, mas o stack atual não consome Redis
  (nenhum módulo ativo usa o WORKER_HOST do boilerplate). Sem ação; pode ser
  desligado para não gastar crédito.

## O que o spike T2.1 decidiu (medição em docs/visao-ocr.md)

- **Textract**, para todas as fontes físicas — inclusive o relevo chumbado,
  que era o risco da constraint 2 do SPEC (99,9% de cima, 85,8% de lado).
- **Bedrock fora da leitura numérica**, por medição e não por bloqueio de
  conta: alucinação plausível é falso OK, e LLM não dá confiança calibrada.
- Pré-processamento que importou: redimensionar fotos acima de ~2600 px no
  lado maior antes de enviar (o envio inline falhava com o arquivo original) e
  cuidar do enquadramento, que pesa mais que resolução.
- Custo real: 15 chamadas `detect-document-text` ≈ USD 0,023 — o OCR não é o
  custo relevante do projeto.
