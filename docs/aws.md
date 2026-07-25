# AWS — serviços, modelos, custos e setup

> Referência dos serviços AWS que o projeto usa: qual serviço faz o quê, em
> qual fase entra, IDs de modelo, estimativa de custo contra os USD 500 de
> créditos e o checklist de setup que precisa acontecer antes da Fase 2.
> Atualizar quando o spike T2.1 decidir Textract × Bedrock.

## Serviços e onde entram

| Serviço | Papel | Entra em |
| --- | --- | --- |
| S3 | Storage das fotos de evidência (FotoEvidencia); URLs assinadas para o front | T2.3 (fallback: disco local se atrasar a demo) |
| Textract | OCR clássico — candidato para placa e serigrafia (texto impresso/pintado); devolve bounding boxes de graça | Spike T2.1 → adapter T2.2 |
| Bedrock (Claude) | Visão para os casos difíceis — série chumbada (relevo baixo contraste), check qualitativo de layout (Could) e futura ingestão do PDF de projeto (Fase 6) | Spike T2.1 → adapter T2.2 |

O boilerplate já traz driver S3 pronto: `FILE_DRIVER=s3` + `ACCESS_KEY_ID`,
`SECRET_ACCESS_KEY`, `AWS_S3_REGION`, `AWS_DEFAULT_S3_BUCKET` no
`backend/.env` (nomes já existem no `env-example-relational`).

## Modelos no Bedrock

IDs no Bedrock levam prefixo `anthropic.` — não usar o ID first-party puro.

| Modelo | ID no Bedrock | Referência de preço first-party (in/out por MTok) | Uso aqui |
| --- | --- | --- | --- |
| Claude Opus 5 | `anthropic.claude-opus-5` | USD 5 / 25 | Default: extração da série chumbada, layout, ingestão de projeto |
| Claude Sonnet 5 | `anthropic.claude-sonnet-5` | USD 3 / 15 (intro 2/10 até 2026-08-31) | Alternativa se o spike mostrar acerto igual com custo menor |
| Claude Haiku 4.5 | `anthropic.claude-haiku-4-5` | USD 1 / 5 | Só se sobrar tempo para otimizar tarefas triviais |

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
- **Textract**: ~USD 0,0015 por página → ≈ USD 0,01 por conferência.
- **S3**: centavos no volume da demo.

Cem conferências de teste + demo custam < USD 25 no pior caso. O risco de
custo não é a demo — é loop de reprocessamento automático, que a constraint 4
do SPEC já proíbe (visão só sob disparo explícito).

## Checklist de setup (fazer antes da Fase 2)

1. Conta AWS com os créditos aplicados; região única para tudo (sugestão:
   `us-east-1`, onde o catálogo Bedrock é mais completo).
2. Console → Bedrock → Model access → habilitar os modelos Anthropic Claude
   (aprovação pode não ser instantânea — fazer cedo).
3. IAM user de aplicação com política mínima: `bedrock:InvokeModel`,
   `textract:DetectDocumentText`, `textract:AnalyzeDocument`, `s3:PutObject`/
   `s3:GetObject` no bucket do projeto. Nada de credencial root.
4. Bucket S3 do projeto criado; nome no `AWS_DEFAULT_S3_BUCKET`.
5. Credenciais só em `backend/.env` (gitignored). Nunca em `NEXT_PUBLIC_*`,
   nunca commitadas — vazamento queima créditos e conta (CLAUDE.md, Nunca
   fazer).
6. Smoke test barato antes do spike: uma chamada Textract e uma Bedrock com
   qualquer foto, para validar credencial/região/model access sem gastar o
   timebox do T2.1.

## O que o spike T2.1 decide (e registra aqui)

- Acerto por fonte física: Textract × Bedrock em placa, serigrafia e chumbado.
- Escolha do serviço (ou combinação: Textract para impresso + Bedrock para
  chumbado) e o modelo Claude usado.
- Prompts/pré-processamento que funcionaram — se render conhecimento caro,
  detalhar aqui.
